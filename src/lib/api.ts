// src/lib/api.ts

export interface UploadInitPayload {
    fileName: string;
    fileType: string;
    category: string;
    firstName: string;
    email: string;
    marketingConsent: boolean;
}

export interface UploadInitResponse {
    presignedUrl: string;
    s3Key: string;
    jobId: string;
    accessToken: string;
}

/**
 * Step 1: Asks the backend for an AWS S3 presigned URL and creates the Job in the DB.
 */
export async function requestUploadUrl(data: UploadInitPayload): Promise<UploadInitResponse> {
    const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initialize upload");
    }

    return res.json();
}

/**
 * Step 2: Pushes the physical file directly to AWS S3 using the presigned URL.
 */
export async function uploadFileToS3(presignedUrl: string, file: File): Promise<void> {
    const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    if (!res.ok) {
        throw new Error("Failed to upload file to S3");
    }
}

// Add these interfaces at the top with your others
export interface OCRPayload {
    jobId: string;
    s3Key: string;
    fileType: string;
}

export interface OCRResponse {
    message: string;
    extractedText: string;
    confidenceFlag: boolean;
}

// Add this function at the bottom of the file
/**
 * Step 3: Tells the backend to read the file sitting in S3 using AWS Textract or Parsers.
 */
export async function triggerOCR(data: OCRPayload): Promise<OCRResponse> {
    const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // If Textract fails (e.g., < 70% confidence), this throws the error to the UI
        throw new Error(errorData.message || "Failed to read the document. Please ensure it is clear and legible.");
    }

    return res.json();
}

export interface GenerateFreePayload {
    jobId: string;
    extractedText: string;
}

export interface GenerateFreeResponse {
    summary: string;
    urgency: string;
}

/**
 * Step 4: Sends the extracted text to OpenAI for the free summary.
 */
export async function generateFreeSummary(data: GenerateFreePayload): Promise<GenerateFreeResponse> {
    const res = await fetch("/api/generate-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate AI summary.");
    }

    return res.json();
}
