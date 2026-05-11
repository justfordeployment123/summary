import { NextResponse } from "next/server";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import pdfParse from "pdf-parse-new";
import mammoth from "mammoth";
import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";

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

// ─── Extract text from a single S3 object ─────────────────────────────────────
async function extractFromS3(
    s3Key: string,
    fileType: string,
    highThreshold: number,
    lowThreshold: number,
): Promise<{ text: string; confidenceFlag: boolean }> {
    let extractedText = "";
    let confidenceFlag = false;

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
            }
            if (block.BlockType === "WORD" && block.Confidence !== undefined) {
                totalConfidence += block.Confidence;
                wordCount++;
            }
        });

        const averageConfidence = wordCount > 0 ? totalConfidence / wordCount : 0;

        if (averageConfidence < lowThreshold) {
            throw new Error("OCR_CONFIDENCE_BELOW_THRESHOLD");
        } else if (averageConfidence < highThreshold) {
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

    return { text: extractedText, confidenceFlag };
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { jobId, s3Key, fileType, fileEntries } = body;

        // ── Normalise into an array of { s3Key, fileType } ───────────────────
        // Supports both:
        //   Legacy:  { jobId, s3Key, fileType }
        //   Multi:   { jobId, fileEntries: [{ s3Key, fileType }, ...] }
        const entries: { s3Key: string; fileType: string }[] =
            Array.isArray(fileEntries) && fileEntries.length > 0 ? fileEntries : [{ s3Key, fileType }];

        if (!jobId || entries.length === 0) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // ── Transition to OCR_PROCESSING ──
        await prisma.job.update({
            where: { id: jobId },
            data: {
                previous_state: job.status,
                status: JobState.OCR_PROCESSING,
                state_transitioned_at: new Date(),
            },
        });

        // ── Fetch admin-configurable confidence thresholds ──
        const [highSetting, lowSetting] = await Promise.all([
            prisma.setting.findUnique({ where: { key: "ocr_confidence_high_threshold" } }),
            prisma.setting.findUnique({ where: { key: "ocr_confidence_low_threshold" } }),
        ]);
        const HIGH_THRESHOLD: number = (highSetting?.value as number) ?? 85;
        const LOW_THRESHOLD: number = (lowSetting?.value as number) ?? 70;

        // console.log(`Starting OCR Processing for Job ID: ${jobId} — ${entries.length} file(s)`);

        // ── Extract text from each file, collect results and clean up S3 ──
        const extractedSegments: string[] = [];
        let anyConfidenceFlag = false;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            try {
                const { text, confidenceFlag } = await extractFromS3(entry.s3Key, entry.fileType, HIGH_THRESHOLD, LOW_THRESHOLD);
                if (confidenceFlag) anyConfidenceFlag = true;
                extractedSegments.push(text.trim());
            } catch (extractionError: any) {
                console.error(`Extraction failed for file ${i + 1} (${entry.s3Key}):`, extractionError.message);

                // Clean up all S3 objects on failure
                await Promise.all(
                    entries.map((e) =>
                        s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: e.s3Key })).catch(console.error),
                    ),
                );

                await prisma.job.update({
                    where: { id: jobId },
                    data: {
                        status: JobState.OCR_FAILED,
                        previous_state: JobState.OCR_PROCESSING,
                        state_transitioned_at: new Date(),
                    },
                });

                const errorMsg =
                    extractionError.message === "OCR_CONFIDENCE_BELOW_THRESHOLD"
                        ? `File ${i + 1}: Image quality too low to read clearly. Please re-upload a clearer image.`
                        : `File ${i + 1}: The document appears to be corrupt, password-protected, or unreadable. Please re-upload.`;

                return NextResponse.json({ error: "EXTRACTION_FAILED", message: errorMsg }, { status: 422 });
            }
        }

        // ── Join segments with clear page separators ──────────────────────────
        // Single file: no separator needed, just use the text as-is.
        // Multiple files: separate with a "Page N" header so the AI understands
        // each segment may be a continuation or a separate page of the letter.
        let combinedText: string;

        if (extractedSegments.length === 1) {
            combinedText = extractedSegments[0];
        } else {
            combinedText = extractedSegments
                .map((segment, i) => {
                    if (i === 0) return segment;
                    return `\n\nPage ${i + 1}\n\n${segment}`;
                })
                .join("");
        }

        // ── 1,200-word hard cap on combined text ──────────────────────────────
        const textWords = combinedText.trim().split(/\s+/);
        if (textWords.length > 1200) {
            combinedText = textWords.slice(0, 1200).join(" ");
        }

        // 
        // ── Store in Temp collection ──
        await prisma.temp.upsert({
            where: { job_id: jobId },
            update: { extracted_text: combinedText },
            create: { job_id: jobId, extracted_text: combinedText },
        });

        // ── Transition state ──
        await prisma.job.update({
            where: { id: jobId },
            data: {
                previous_state: JobState.OCR_PROCESSING,
                status: JobState.FREE_SUMMARY_GENERATING,
                state_transitioned_at: new Date(),
            },
        });

        return NextResponse.json({ message: "Extraction Complete", extractedText: combinedText, confidenceFlag: anyConfidenceFlag }, { status: 200 });
    } catch (error) {
        console.error("Processing Route Error:", error);
        return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
    }
}
