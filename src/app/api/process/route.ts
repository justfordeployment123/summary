// src/app/api/process/route.ts
//
// Matches your existing codebase patterns:
//   • Uses dbConnect (not connectToDatabase)
//   • Uses JobState enum from @/types/job
//   • Uses Temp model for extracted text storage (24-hr TTL)
//   • Confidence thresholds admin-configurable via Settings
//   • Three-layer OCR failure handling (§5.3)
//   • 1,200-word hard cap enforced here before returning to client (§9.1)

import { NextResponse } from "next/server";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import pdfParse from "pdf-parse-new";
import mammoth from "mammoth";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import Temp from "@/models/Temp";
import { JobState } from "@/types/job";
import { Setting } from "@/models/Setting";

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

        // ── Transition to OCR_PROCESSING ──
        job.previous_state = job.status;
        job.status = JobState.OCR_PROCESSING;
        job.state_transitioned_at = new Date();
        await job.save();

        // ── Fetch admin-configurable confidence thresholds (§5.2) ──
        const [highSetting, lowSetting] = await Promise.all([
            Setting.findOne({ key: "ocr_confidence_high_threshold" }).lean<any>(),
            Setting.findOne({ key: "ocr_confidence_low_threshold" }).lean<any>(),
        ]);
        const HIGH_THRESHOLD: number = highSetting?.value ?? 85;
        const LOW_THRESHOLD: number = lowSetting?.value ?? 70;

        console.log("Starting OCR Processing for Job ID:", jobId);
        let extractedText = "";
        let confidenceFlag = false;

        try {
            if (fileType === "image/jpeg" || fileType === "image/png") {
                // ── AWS Textract (§5.1) ──
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
                    }
                    // Use WORD blocks for confidence — more granular than LINE (§5.2)
                    if (block.BlockType === "WORD" && block.Confidence !== undefined) {
                        totalConfidence += block.Confidence;
                        wordCount++;
                    }
                });

                const averageConfidence = wordCount > 0 ? totalConfidence / wordCount : 0;

                // ── Three-layer confidence handling (§5.2) ──
                if (averageConfidence < LOW_THRESHOLD) {
                    throw new Error("OCR_CONFIDENCE_BELOW_THRESHOLD");
                } else if (averageConfidence < HIGH_THRESHOLD) {
                    // Flag — processing continues, warning shown to user
                    confidenceFlag = true;
                }
            } else {
                // ── PDF / DOCX direct extraction ──
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
                } else if (
                    fileType ===
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ) {
                    const docxData = await mammoth.extractRawText({ buffer });
                    extractedText = docxData.value;
                }

                if (!extractedText || extractedText.trim().length === 0) {
                    throw new Error("EMPTY_DOCUMENT");
                }
            }
        } catch (extractionError: any) {
            console.error("Extraction Failed:", extractionError.message);

            job.status = JobState.OCR_FAILED;
            job.previous_state = JobState.OCR_PROCESSING;
            job.state_transitioned_at = new Date();
            await job.save();

            // Delete from S3 immediately on failure (§4.2)
            await s3Client
                .send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: s3Key }))
                .catch(console.error);

            const errorMsg =
                extractionError.message === "OCR_CONFIDENCE_BELOW_THRESHOLD"
                    ? "Image quality too low to read clearly. Please re-upload a clearer image."
                    : "The document appears to be corrupt, password-protected, or unreadable. Please re-upload.";

            return NextResponse.json(
                { error: "EXTRACTION_FAILED", message: errorMsg },
                { status: 422 },
            );
        }

        // ── 1,200-word hard cap on input before AI (§9.1) ──
        const textWords = extractedText.trim().split(/\s+/);
        if (textWords.length > 1200) {
            extractedText = textWords.slice(0, 1200).join(" ");
        }
        console.log(`Extraction complete for Job ID: ${jobId}. Word count: ${textWords.length}. Confidence flag: ${confidenceFlag}`);
        console.log("Extracted Text Sample:", extractedText.slice(0, 500)); // Log first 500 chars for debugging

        // ── Store in Temp collection (24-hr TTL failsafe, §4.3) ──
        await Temp.findOneAndUpdate(
            { job_id: jobId },
            { extracted_text: extractedText },
            { upsert: true, new: true },
        );

        // ── Transition state ──
        job.previous_state = job.status;
        job.status = JobState.FREE_SUMMARY_GENERATING;
        job.state_transitioned_at = new Date();
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