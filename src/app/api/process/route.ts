import { NextResponse } from "next/server";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

// Initialize Textract Client
const textractClient = new TextractClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(request: Request) {
    try {
        const { jobId, s3Key, fileType } = await request.json();

        if (!jobId || !s3Key) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        await dbConnect();
        const job = await Job.findById(jobId);
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // 1. Advance State: UPLOADED -> OCR_PROCESSING
        job.previous_state = job.status;
        job.status = JobState.OCR_PROCESSING;
        job.state_transitioned_at = new Date();
        await job.save();

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.UPLOADED,
            to_state: JobState.OCR_PROCESSING,
            triggered_by: "system_process_route",
        });

        let extractedText = "";
        let confidenceFlag = false;

        // 2. Route based on file type
        if (fileType === "image/jpeg" || fileType === "image/png") {
            // Tell AWS Textract to read the file directly from S3!
            const command = new DetectDocumentTextCommand({
                Document: {
                    S3Object: {
                        Bucket: process.env.AWS_S3_BUCKET_NAME!,
                        Name: s3Key,
                    },
                },
            });

            const response = await textractClient.send(command);

            // 3. Process Textract Blocks & Calculate Confidence
            let totalConfidence = 0;
            let wordCount = 0;

            response.Blocks?.forEach((block) => {
                if (block.BlockType === "LINE" && block.Text) {
                    extractedText += block.Text + "\n";
                    if (block.Confidence) {
                        totalConfidence += block.Confidence;
                        wordCount++;
                    }
                }
            });

            const averageConfidence = wordCount > 0 ? totalConfidence / wordCount : 0;
            console.log(`OCR Average Confidence: ${averageConfidence}%`);

            // 4. Enforce Client Confidence Thresholds
            if (averageConfidence < 70) {
                // Mark as failed
                job.status = JobState.OCR_FAILED;
                await job.save();
                // NOTE: You would also trigger the S3 deletion here as per specs
                return NextResponse.json({ error: "OCR_FAILED", message: "Document unreadable. Please re-upload." }, { status: 422 });
            } else if (averageConfidence >= 70 && averageConfidence < 85) {
                confidenceFlag = true; // Low quality flagged
            }
        } else {
            // Placeholder for PDF/DOCX direct parsing
            extractedText = "Extracted text from PDF goes here...";
        }

        // 5. Enforce Hard 1,200 Word Limit BEFORE AI Processing
        const textWords = extractedText.split(/\s+/);
        if (textWords.length > 1200) {
            extractedText = textWords.slice(0, 1200).join(" ");
            console.log("Text truncated to 1,200 words.");
        }

        // 6. Advance State: OCR_PROCESSING -> FREE_SUMMARY_GENERATING
        job.previous_state = job.status;
        job.status = JobState.FREE_SUMMARY_GENERATING;
        await job.save();

        // IMPORTANT: The requirements state the extracted text is NOT permanently stored in the DB.
        // We return it here so the next function can immediately send it to OpenAI.
        return NextResponse.json(
            {
                message: "OCR Complete",
                extractedText,
                confidenceFlag,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("OCR Processing Error:", error);
        return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
    }
}
