// src/lib/api.ts
// ─── Upload ──────────────────────────────────────────────────────────────────

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

// ─── S3 Upload ───────────────────────────────────────────────────────────────

/**
 * Step 2: Pushes the physical file directly to AWS S3 using the presigned URL.
 */
export async function uploadFileToS3(presignedUrl: string, file: File): Promise<void> {
    const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
    });

    if (!res.ok) {
        throw new Error("Failed to upload file to S3");
    }
}

// ─── OCR ─────────────────────────────────────────────────────────────────────

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
        throw new Error(errorData.message || "Failed to read the document. Please ensure it is clear and legible.");
    }

    return res.json();
}

// ─── Free Summary ─────────────────────────────────────────────────────────────

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
 * Server enforces a 100–130 word limit on the response and a 1,200-word
 * hard cap on the input text before forwarding to OpenAI.
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

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CheckoutPayload {
    jobId: string;
    accessToken: string;
    upsells: string[]; // array of upsell _id strings
    disclaimerAcknowledged: boolean;
    successUrl: string; // same-page return URL with flags
    cancelUrl: string;
}

export interface CheckoutResponse {
    url: string;
}

/**
 * Step 5: Ask backend to create a Stripe Checkout Session.
 * The server validates disclaimerAcknowledged before creating the session.
 * successUrl & cancelUrl are passed from the client so Stripe returns to
 * the correct page/state (the single-page flow).
 */
export async function createCheckoutSession(data: CheckoutPayload): Promise<CheckoutResponse> {
    const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initialize checkout.");
    }

    return res.json();
}

// ─── Job Status (polling) ─────────────────────────────────────────────────────

export interface JobStatusResponse {
    status: string;
    detailedBreakdown?: string;
    urgency?: string;
    referenceId?: string;
    error?: string;
}

/**
 * Step 6: Poll job status after returning from Stripe.
 * The token is passed in the query string (URL Enumeration Guard requirement).
 * Called repeatedly on the same page until status === "COMPLETED" or "FAILED".
 */
export async function checkJobStatus(jobId: string, accessToken: string): Promise<JobStatusResponse> {
    const res = await fetch(`/api/jobs/${jobId}/status?token=${accessToken}`);

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Unable to retrieve your results.");
    }

    return res.json();
}

// ─── Upsells ─────────────────────────────────────────────────────────────────

export interface UpsellOption {
    _id: string;
    name: string;
    description: string;
    is_active: boolean;
    category_prices: Record<string, number>; // categoryId → price in pence
}

export interface UpsellsResponse {
    upsells: UpsellOption[];
}

/**
 * Fetches active upsell options to display on the payment card.
 */
export async function fetchUpsells(): Promise<UpsellsResponse> {
    const res = await fetch("/api/upsells");

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load upsells.");
    }

    return res.json();
}

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Opens a download link in a new tab.
 * The server validates: job token is valid AND job.status === COMPLETED
 * AND payment_status === confirmed before serving the file.
 * Download links expire 72 hours after job completion (server-enforced).
 */
export function openDownload(jobId: string, accessToken: string, format: "pdf" | "docx" | "txt"): void {
    window.open(`/api/download/${format}?job_id=${jobId}&token=${accessToken}`, "_blank");
}
