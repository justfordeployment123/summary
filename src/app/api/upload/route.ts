import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";
import { JobStateLog } from "@/models/JobStateLog";

// Initialize the S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const ALLOWED_MIME_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileName, fileType, category, firstName, email, marketingConsent } = body;

        // 1. Initial Server-Side Validation
        if (!ALLOWED_MIME_TYPES.includes(fileType)) {
            return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
        }

        // 2. Generate secure UUIDs for S3 and our Reference ID
        const fileExtension = fileName.split(".").pop();
        const s3Key = `${uuidv4()}.${fileExtension}`; // Never use original filename [cite: 39]

        // 3. Create the Presigned URL command
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: s3Key,
            ContentType: fileType,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        // 4. Connect to MongoDB and Create the Job Record
        await dbConnect();

        // The access_token is automatically generated as a UUID v4 by our Mongoose schema
        const newJob = await Job.create({
            reference_id: s3Key,
            category_id: category,
            user_email: email,
            user_name: firstName,
            marketing_consent: marketingConsent || false,
            status: JobState.UPLOADED,
        });

        // 5. Write the initial state to the JobStateLog (Audit Trail Requirement)
        await JobStateLog.create({
            job_id: newJob._id,
            from_state: "INIT",
            to_state: JobState.UPLOADED,
            triggered_by: "system_upload_init",
        });

        // 6. Return the URL and the secure keys to the frontend
        return NextResponse.json(
            {
                presignedUrl,
                s3Key,
                jobId: newJob._id,
                accessToken: newJob.access_token,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Upload Route Error:", error);
        return NextResponse.json({ error: "Failed to initialize upload" }, { status: 500 });
    }
}
