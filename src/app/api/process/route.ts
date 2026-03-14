import { NextResponse } from "next/server";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import pdfParse from "pdf-parse-new";
import mammoth from "mammoth";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import Temp from "@/models/Temp"; // <-- IMPORT TEMP MODEL
import { JobState } from "@/types/job";
import { JobStateLog } from "@/models/JobStateLog";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

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

        job.previous_state = job.status;
        job.status = JobState.OCR_PROCESSING;
        job.state_transitioned_at = new Date();
        await job.save();

        console.log("Starting OCR Processing for Job ID:", jobId);
        let extractedText = "";
        let confidenceFlag = false;

        try {
            if (fileType === "image/jpeg" || fileType === "image/png") {
                const command = new DetectDocumentTextCommand({
                    Document: {
                        S3Object: { Bucket: process.env.AWS_S3_BUCKET_NAME!, Name: s3Key },
                    },
                });

                const response = await textractClient.send(command);
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

                if (averageConfidence < 70) {
                    throw new Error("OCR_FAILED");
                } else if (averageConfidence >= 70 && averageConfidence < 85) {
                    confidenceFlag = true;
                }
            } else {
                const getObjCmd = new GetObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME!,
                    Key: s3Key,
                });
                const s3Response = await s3Client.send(getObjCmd);
                const byteArray = await s3Response.Body?.transformToByteArray();
                const buffer = Buffer.from(byteArray!);

                if (fileType === "application/pdf") {
                    const pdfData = await pdfParse(buffer);
                    extractedText = pdfData.text;
                } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                    const docxData = await mammoth.extractRawText({ buffer });
                    extractedText = docxData.value;
                }

                if (!extractedText || extractedText.trim().length === 0) {
                    throw new Error("EMPTY_DOCUMENT");
                }
            }
        } catch (extractionError: any) {
            console.error("Extraction Failed:", extractionError);

            job.status = JobState.OCR_FAILED;
            await job.save();

            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME!,
                    Key: s3Key,
                }),
            );

            const errorMsg =
                extractionError.message === "OCR_FAILED"
                    ? "Image quality too low to read clearly. Please re-upload a clearer image."
                    : "The document appears to be corrupt, password-protected, or unreadable. Please re-upload.";

            return NextResponse.json({ error: "EXTRACTION_FAILED", message: errorMsg }, { status: 422 });
        }

        const textWords = extractedText.trim().split(/\s+/);
        if (textWords.length > 1200) {
            extractedText = textWords.slice(0, 1200).join(" ");
        }

        // 👇 NEW: TEMPORARILY SAVE TEXT TO TEMP COLLECTION 👇
        await Temp.findOneAndUpdate(
            { job_id: jobId },
            { extracted_text: extractedText },
            { upsert: true, new: true }
        );
        // 👆 --------------------------------------------- 👆

        job.previous_state = job.status;
        job.status = JobState.FREE_SUMMARY_GENERATING;
        await job.save();

        return NextResponse.json(
            {
                message: "Extraction Complete",
                extractedText,
                confidenceFlag,
            },
            { status: 200 },    
        );
    } catch (error) {
        console.error("Processing Route Error:", error);
        return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
    }
}