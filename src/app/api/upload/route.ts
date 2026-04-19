import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
];
const DAILY_LIMIT = 5;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileName, fileType, category: categoryId, firstName, email, marketingConsent, turnstileToken } = body;

        // 1. Verify Turnstile token
        const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            body: new URLSearchParams({
                secret: process.env.TURNSTILE_SECRET_KEY!,
                response: turnstileToken ?? "",
            }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
            return NextResponse.json({ error: "Security check failed. Please try again." }, { status: 403 });
        }

        // 2. File type validation
        if (!ALLOWED_MIME_TYPES.includes(fileType)) {
            return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
        }

        // 3. Validate category
        const matchedCategory = await prisma.category.findFirst({
            where: {
                id: categoryId,
                is_active: true,
            },
        });
        if (!matchedCategory) {
            return NextResponse.json({ error: "Invalid or inactive category selected." }, { status: 400 });
        }

        // 4. Per-email daily rate limit check
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayCount = await prisma.job.count({
            where: {
                user_email: email,
                created_at: { gte: startOfDay },
            },
        });

        if (todayCount >= DAILY_LIMIT) {
            return NextResponse.json(
                {
                    error: "Daily limit reached: You have already used your 5 free summaries for today.",
                    message: "You've used your 5 free summaries for today. Your limit resets at midnight — come back tomorrow!",
                    remaining: 0,
                },
                { status: 429 },
            );
        }

        // 5. Generate secure UUID for S3
        const fileExtension = fileName.split(".").pop();
        const s3Key = `${uuidv4()}.${fileExtension}`;

        // 6. Create presigned URL
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: s3Key,
            ContentType: fileType,
        });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        // 7. Create Job record
        const newJob = await prisma.job.create({
            data: {
                reference_id: s3Key,
                category_id: matchedCategory.id,
                user_email: email,
                user_name: firstName,
                marketing_consent: marketingConsent || false,
                status: JobState.UPLOADED,
            },
        });

        // 8. Write initial state log
        await prisma.jobStateLog.create({
            data: {
                job_id: newJob.id,
                from_state: "INIT",
                to_state: JobState.UPLOADED,
                triggered_by: "system_upload_init",
            },
        });

        return NextResponse.json(
            {
                presignedUrl,
                s3Key,
                jobId: newJob.id,
                accessToken: newJob.access_token,
                remaining: DAILY_LIMIT - (todayCount + 1),
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Upload Route Error:", error);
        return NextResponse.json({ error: "Failed to initialize upload" }, { status: 500 });
    }
}