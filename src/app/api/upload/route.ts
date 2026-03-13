import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { Category } from "@/models/Category";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

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
        // Here, 'category' is actually the Category DB _id sent from the frontend
        const { fileName, fileType, category: categoryId, firstName, email, marketingConsent } = body;

        // 1. Initial Server-Side Validation
        if (!ALLOWED_MIME_TYPES.includes(fileType)) {
            return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
        }

        // 2. Connect to MongoDB early to validate category
        await dbConnect();

        // 3. Securely lookup the actual category name
        const matchedCategory = await Category.findById(categoryId);
        if (!matchedCategory || !matchedCategory.is_active) {
            return NextResponse.json({ error: "Invalid or inactive category selected." }, { status: 400 });
        }

        // 4. Generate secure UUIDs for S3 and our Reference ID
        const fileExtension = fileName.split(".").pop();
        const s3Key = `${uuidv4()}.${fileExtension}`;

        // 5. Create the Presigned URL command
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: s3Key,
            ContentType: fileType,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        // 6. Create the Job Record using both the ID and the secure DB name
        // 6. Create the Job Record
        const newJob = await Job.create({
            reference_id: s3Key,
            category_id: matchedCategory._id, // Now natively handles the ObjectId reference!
            user_email: email,
            user_name: firstName,
            marketing_consent: marketingConsent || false,
            status: JobState.UPLOADED,
        });
        // 7. Write the initial state to the JobStateLog
        await JobStateLog.create({
            job_id: newJob._id,
            from_state: "INIT",
            to_state: JobState.UPLOADED,
            triggered_by: "system_upload_init",
        });

        // 8. Return the URL and the secure keys to the frontend
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
