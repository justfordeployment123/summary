// src/lib/api.ts

// ─── Upload ──────────────────────────────────────────────────────────────────

export interface UploadInitPayload {
    fileName: string;
    fileType: string;
    category: string;
    firstName: string;
    email: string;
    marketingConsent: boolean;
    turnstileToken: string; 
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

// ─── Payment: Embedded Elements flow (primary) ────────────────────────────────

export interface CreatePaymentIntentPayload {
    jobId: string;
    accessToken: string;
    upsells: string[]; // array of upsell _id strings
    disclaimerAcknowledged: boolean;
}

export interface CreatePaymentIntentResponse {
    clientSecret: string;
}

/**
 * Step 5a (embedded flow): Creates a Stripe PaymentIntent and returns the
 * clientSecret which is passed to <Elements> to render the inline payment form.
 *
 * The server:
 *   - Validates disclaimerAcknowledged (§13.2)
 *   - Re-validates job state and access token (§7.3)
 *   - Calculates the total amount server-side from DB prices (never trust client)
 *   - Re-uses an existing pending intent if the user refreshes (idempotent)
 *   - Transitions job to AWAITING_PAYMENT and stores stripe_payment_intent_id
 *
 * Payment confirmation is triggered by the verified webhook (payment_intent.succeeded),
 * NOT by the client (§7.2).
 */
export async function createPaymentIntent(
    data: CreatePaymentIntentPayload,
): Promise<CreatePaymentIntentResponse> {
    const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initialise payment.");
    }

    return res.json();
}

// ─── Payment: Hosted Checkout flow (legacy / fallback) ───────────────────────

export interface CheckoutPayload {
    jobId: string;
    accessToken: string;
    upsells: string[];
    disclaimerAcknowledged: boolean;
    successUrl: string;
    cancelUrl: string;
}

export interface CheckoutResponse {
    url: string;
}

/**
 * Step 5b (hosted Checkout flow — legacy): Creates a Stripe Checkout Session
 * and returns the hosted page URL to redirect the user to.
 *
 * Keep this for fallback / server-side rendering contexts where the embedded
 * Elements form cannot be used (e.g. no-JS environments, future admin flows).
 * The primary flow uses createPaymentIntent + <Elements> instead.
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
 * Step 6: Poll job status after payment completes.
 * Used in both flows — embedded (after stripe.confirmPayment resolves) and
 * hosted Checkout (after returning from Stripe's success_url redirect).
 *
 * The token is passed in the query string (URL Enumeration Guard, §7.3).
 * Called repeatedly until status === "COMPLETED" or "FAILED".
 */
export async function checkJobStatus(
    jobId: string,
    accessToken: string,
): Promise<JobStatusResponse> {
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
 * Fetches all active upsell options.
 * The frontend filters these client-side by category (only shows upsells
 * where category_prices[categoryId] > 0) — see page.tsx categoryUpsells.
 * The server re-validates prices before charging (§7, §15).
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
 * Download links expire 72 hours after job completion (server-enforced, §7.3).
 */
export function openDownload(
    jobId: string,
    accessToken: string,
    format: "pdf" | "docx" | "txt",
): void {
    window.open(`/api/download/${format}?job_id=${jobId}&token=${accessToken}`, "_blank");
}