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

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";
import WebhookEvent from "@/models/WebhookEvent";
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
        return NextResponse.json(
            { error: `Webhook signature verification failed: ${err.message}` },
            { status: 400 },
        );
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
                // ── Legacy hosted Checkout flow ──
                await handleCheckoutCompleted(event);
                break;

            case "payment_intent.succeeded":
                // ── Embedded Elements flow ──
                // Only process if the intent has our metadata (jobId + accessToken).
                // Intents created by a Checkout Session also fire this event — we skip
                // those here because checkout.session.completed already handles them.
                await handlePaymentIntentSucceeded(event);
                break;

            default:
                // Acknowledge all other event types without processing
                console.log(`[webhook] Unhandled event type: ${event.type}`);
        }
    } catch (error: any) {
        console.error(`[webhook] Handler error for ${event.type}:`, error.message);
        // Return 500 so Stripe retries — idempotency guard above prevents duplicate processing
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
        // Checkout sessions set this flag so payment_intent.succeeded knows to skip
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

    // Tag the PaymentIntent so the payment_intent.succeeded handler knows to skip it
    // (avoids double-processing when both events fire for a Checkout Session)
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
        paymentIntentId: String(session.payment_intent ?? ""),
        eventId: event.id,
    });
}

// ─── Handler: payment_intent.succeeded (embedded Elements flow) ───────────────

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { jobId, accessToken, upsells, fromCheckoutSession } = extractMetadata(intent.metadata);

    // Skip intents that belong to a Checkout Session — they're handled by
    // handleCheckoutCompleted above to prevent double AI generation.
    if (fromCheckoutSession) {
        console.log(`[webhook] payment_intent.succeeded ${intent.id} — belongs to Checkout Session, skipping.`);
        return;
    }

    if (!jobId || !accessToken) {
        // This intent wasn't created by us (e.g. Stripe dashboard test) — ignore silently
        console.log(`[webhook] payment_intent.succeeded ${intent.id} — no jobId metadata, skipping.`);
        return;
    }

    await WebhookEvent.findOneAndUpdate({ stripe_event_id: event.id }, { job_id: jobId });

    await confirmAndGenerate({
        jobId,
        accessToken,
        upsells,
        paymentIntentId: intent.id,
        eventId: event.id,
    });
}

// ─── Shared: state transition + AI trigger ────────────────────────────────────

interface ConfirmAndGenerateParams {
    jobId: string;
    accessToken: string;
    upsells: string[];
    paymentIntentId: string;
    eventId: string;
}

async function confirmAndGenerate({
    jobId,
    accessToken,
    upsells,
    paymentIntentId,
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
        console.warn(
            `[webhook] Job ${jobId} is in '${job.status}' — not AWAITING_PAYMENT. Discarding event ${eventId}.`,
        );
        return;
    }

    // ── 5. Atomic state update: AWAITING_PAYMENT → PAYMENT_CONFIRMED (§7.1) ──
    // The findOneAndUpdate with the status condition acts as the database-level
    // payment lock — prevents a race between two concurrent webhook deliveries.
    const updated = await Job.findOneAndUpdate(
        {
            _id: jobId,
            status: JobState.AWAITING_PAYMENT, // atomic check
        },
        {
            status: JobState.PAYMENT_CONFIRMED,
            previous_state: JobState.AWAITING_PAYMENT,
            state_transitioned_at: new Date(),
            stripe_payment_intent_id: paymentIntentId,
        },
        { new: true },
    );

    if (!updated) {
        console.warn(`[webhook] Job ${jobId} state update race detected — skipping (event: ${eventId}).`);
        return;
    }

    // ── 6. Read extracted text from Temp collection (24-hr TTL, §4.3) ──
    const tempDoc = await Temp.findOne({ job_id: String(jobId) }).lean<any>();

    if (!tempDoc?.extracted_text) {
        console.error(`[webhook] No extracted text in Temp for job ${jobId}`);
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FAILED,
            previous_state: JobState.PAYMENT_CONFIRMED,
            state_transitioned_at: new Date(),
        });
        return;
    }

    // ── 7. Trigger paid AI generation (webhook-only trigger, §7.2) ──
    try {
        await generatePaidBreakdown(jobId, tempDoc.extracted_text, upsells);
        // Clean up Temp document after successful paid generation
        await Temp.deleteOne({ job_id: String(jobId) });
    } catch (error: any) {
        console.error(`[webhook] Paid generation failed for ${jobId}:`, error.message);
        // generatePaidBreakdown already sets status to FAILED on error — no need to set here
    }
}