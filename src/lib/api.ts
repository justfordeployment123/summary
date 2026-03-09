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

export async function triggerOCR(jobId: string, s3Key: string, fileType: string) {
  const res = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, s3Key, fileType }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to process text");
  }

  return res.json();
}
