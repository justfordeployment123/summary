// src/app/api/webhook/route.ts
//
// CRITICAL SECURITY REQUIREMENTS (§7):
//   • Stripe webhook signature verification on EVERY request
//   • Idempotency: duplicate events return HTTP 200 without reprocessing
//   • Payment lock: paid AI triggered ONLY from verified webhook (never client redirect)
//   • Job must be in AWAITING_PAYMENT state to advance to PAYMENT_CONFIRMED
//   • Atomic state update within a single DB operation
//   • Invalid signature → HTTP 400 + logged
//
// Handles TWO payment flows:
//   1. Hosted Checkout (legacy):   checkout.session.completed  → metadata on session
//   2. Embedded Elements (new):    payment_intent.succeeded    → metadata on intent
//
// Extracted text is read from the Temp collection (24-hr TTL), not from the Job doc.
//
// FIX: JobPayment record is now created in confirmAndGenerate() after the atomic
// state update. Previously the webhook updated Job.stripe_payment_intent_id but
// never inserted a row into the job_payments collection, so the admin revenue
// dashboard and per-job payment detail had no data.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";
import WebhookEvent from "@/models/WebhookEvent";
import { JobPayment } from "@/models/JobPayment";
import Temp from "@/models/Temp";
import { generatePaidBreakdown } from "@/app/api/generate-paid/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    // ── 1. Verify Stripe signature (§7.1, §19) ──
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        console.error("[webhook] Missing stripe-signature header");
        return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
        console.error("[webhook] Invalid signature:", err.message);
        return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

    await dbConnect();

    // ── 2. Idempotency check (§7.1) ──
    // Store every received event ID. If we've seen it before, return 200 silently.
    const existingEvent = await WebhookEvent.findOne({
        stripe_event_id: event.id,
    }).lean();

    if (existingEvent) {
        console.log(`[webhook] Duplicate event ${event.id} — skipping.`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    // Record event before processing to prevent race conditions on parallel retries
    await WebhookEvent.create({
        stripe_event_id: event.id,
        event_type: event.type,
        job_id: null, // updated below once we identify the job
        processed_at: new Date(),
    });

    // ── 3. Route to the appropriate handler ──
    try {
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(event);
                break;

            case "payment_intent.succeeded":
                // Only process if the intent has our metadata (jobId + accessToken).
                // Intents created by a Checkout Session also fire this event — we skip
                // those here because checkout.session.completed already handles them.
                await handlePaymentIntentSucceeded(event);
                break;

            default:
                console.log(`[webhook] Unhandled event type: ${event.type}`);
        }
    } catch (error: any) {
        console.error(`[webhook] Handler error for ${event.type}:`, error.message);
        // Return 500 so Stripe retries — idempotency guard above prevents double-processing
        return NextResponse.json({ error: "Internal handler error." }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

// ─── Helper: extract metadata from either flow ────────────────────────────────

function extractMetadata(metadata: Stripe.Metadata | null): {
    jobId: string | null;
    accessToken: string | null;
    upsells: string[];
    fromCheckoutSession: boolean;
} {
    if (!metadata) return { jobId: null, accessToken: null, upsells: [], fromCheckoutSession: false };

    return {
        jobId: metadata.jobId ?? null,
        accessToken: metadata.accessToken ?? null,
        upsells: JSON.parse(metadata.upsells ?? "[]"),
        fromCheckoutSession: metadata.fromCheckoutSession === "true",
    };
}

// ─── Handler: checkout.session.completed (hosted Checkout flow) ───────────────

async function handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const { jobId, accessToken, upsells } = extractMetadata(session.metadata);

    if (!jobId || !accessToken) {
        console.error("[webhook] checkout.session.completed — missing jobId/accessToken in metadata");
        return;
    }

    // Tag the PaymentIntent so payment_intent.succeeded knows to skip it
    if (session.payment_intent) {
        await stripe.paymentIntents.update(String(session.payment_intent), {
            metadata: { fromCheckoutSession: "true" },
        });
    }

    await WebhookEvent.findOneAndUpdate({ stripe_event_id: event.id }, { job_id: jobId });

    await confirmAndGenerate({
        jobId,
        accessToken,
        upsells,
        stripeSessionId: session.id,
        paymentIntentId: String(session.payment_intent ?? ""),
        // Amount is in pence/cents — convert to pounds/dollars for storage
        amountTotal: session.amount_total ?? 0,
        currency: session.currency ?? "gbp",
        eventId: event.id,
    });
}

// ─── Handler: payment_intent.succeeded (embedded Elements flow) ───────────────

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { jobId, accessToken, upsells, fromCheckoutSession } = extractMetadata(intent.metadata);

    // Skip intents that belong to a Checkout Session
    if (fromCheckoutSession) {
        console.log(`[webhook] payment_intent.succeeded ${intent.id} — belongs to Checkout Session, skipping.`);
        return;
    }

    if (!jobId || !accessToken) {
        console.log(`[webhook] payment_intent.succeeded ${intent.id} — no jobId metadata, skipping.`);
        return;
    }

    await WebhookEvent.findOneAndUpdate({ stripe_event_id: event.id }, { job_id: jobId });

    await confirmAndGenerate({
        jobId,
        accessToken,
        upsells,
        stripeSessionId: "", // No session ID in the Elements flow
        paymentIntentId: intent.id,
        amountTotal: intent.amount ?? 0,
        currency: intent.currency ?? "gbp",
        eventId: event.id,
    });
}

// ─── Shared: state transition + JobPayment creation + AI trigger ──────────────

interface ConfirmAndGenerateParams {
    jobId: string;
    accessToken: string;
    upsells: string[];
    stripeSessionId: string;
    paymentIntentId: string;
    amountTotal: number; // in smallest currency unit (pence/cents)
    currency: string;
    eventId: string;
}

async function confirmAndGenerate({
    jobId,
    accessToken,
    upsells,
    stripeSessionId,
    paymentIntentId,
    amountTotal,
    currency,
    eventId,
}: ConfirmAndGenerateParams) {
    // ── 4. Payment lock check (§7.2) ──
    // Job MUST be in AWAITING_PAYMENT. Any other state → discard.
    const job = await Job.findOne({
        _id: jobId,
        access_token: accessToken,
    }).lean<any>();

    if (!job) {
        console.error(`[webhook] Job ${jobId} not found (event: ${eventId})`);
        return;
    }

    if (job.status !== JobState.AWAITING_PAYMENT) {
        console.warn(`[webhook] Job ${jobId} is in '${job.status}' — not AWAITING_PAYMENT. Discarding event ${eventId}.`);
        return;
    }

    // ── 5. Atomic state update: AWAITING_PAYMENT → PAYMENT_CONFIRMED (§7.1) ──
    // findOneAndUpdate with the status condition acts as the DB-level payment lock —
    // prevents a race between two concurrent webhook deliveries.
    const updated = await Job.findOneAndUpdate(
        {
            _id: jobId,
            status: JobState.AWAITING_PAYMENT, // atomic guard
        },
        {
            status: JobState.PAYMENT_CONFIRMED,
            previous_state: JobState.AWAITING_PAYMENT,
            state_transitioned_at: new Date(),
            stripe_payment_intent_id: paymentIntentId,
            upsells_purchased: upsells,
        },
        { new: true },
    );

    if (!updated) {
        // Another concurrent webhook delivery already advanced the state
        console.warn(`[webhook] Job ${jobId} state update race detected — skipping (event: ${eventId}).`);
        return;
    }

    // ── 6. Record payment in JobPayment collection ──
    // This was missing — without this, the admin revenue dashboard and
    // per-job payment detail panel have no data to display.
    try {
        await JobPayment.create({
            job_id: jobId,
            stripe_session_id: stripeSessionId,
            stripe_payment_intent_id: paymentIntentId,
            // Store in smallest unit (pence/cents) to match Stripe convention,
            // then divide by 100 for display in the admin panel.
            amount: amountTotal,
            currency: currency.toLowerCase(),
            status: "completed",
            upsells_purchased: upsells,
        });
    } catch (paymentRecordError: any) {
        // Non-fatal: log but don't block AI generation. The job state is already
        // PAYMENT_CONFIRMED so the user won't be double-charged. An admin can
        // cross-reference the Stripe dashboard for payment details if needed.
        console.error(`[webhook] Failed to create JobPayment record for job ${jobId}:`, paymentRecordError.message);
    }

    // ── 7. Read extracted text from Temp collection (24-hr TTL, §4.3) ──
    const tempDoc = await Temp.findOne({ job_id: String(jobId) }).lean<any>();

    if (!tempDoc?.extracted_text) {
        console.error(`[webhook] No extracted text in Temp for job ${jobId}`);
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FAILED,
            previous_state: JobState.PAYMENT_CONFIRMED,
            state_transitioned_at: new Date(),
        });
        // Update the JobPayment record to reflect the failure
        await JobPayment.findOneAndUpdate({ job_id: jobId, stripe_payment_intent_id: paymentIntentId }, { status: "failed" });
        return;
    }

    // ── 8. Trigger paid AI generation (webhook-only trigger, §7.2) ──
    try {
        await generatePaidBreakdown(jobId, tempDoc.extracted_text, upsells);
        // Clean up Temp document after successful paid generation
        await Temp.deleteOne({ job_id: String(jobId) });
    } catch (error: any) {
        console.error(`[webhook] Paid generation failed for ${jobId}:`, error.message);
        // generatePaidBreakdown already sets status to FAILED on error.
        // Update payment record to surface the issue in admin dashboard.
        await JobPayment.findOneAndUpdate({ job_id: jobId, stripe_payment_intent_id: paymentIntentId }, { status: "failed" });
    }
}
