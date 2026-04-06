// src/app/api/webhook/route.ts
//
// CRITICAL SECURITY REQUIREMENTS (§7):
//   • Stripe webhook signature verification on EVERY request
//   • Idempotency: duplicate events return HTTP 200 without reprocessing
//   • Payment lock: paid AI triggered ONLY from verified webhook (never client redirect)
//   • Job must be in AWAITING_PAYMENT to advance — any other state is discarded
//   • Atomic state update via findOneAndUpdate with status condition
//   • Invalid signature → HTTP 400 + logged
//
// JobPayment strategy:
//   • checkout/route.ts or create-payment-intent/route.ts creates a "pending"
//     JobPayment record at session/intent creation time
//   • This webhook simply updates that record to "completed"
//   • If no pending record exists for any reason, we create one here as a fallback
//     but this should be rare after the checkout/intent fixes

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";
import WebhookEvent from "@/models/WebhookEvent";
import { JobPayment } from "@/models/JobPayment";
import Temp from "@/models/Temp";
import { generatePaidBreakdown } from "@/app/api/generate-paid/paidService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    // ── 1. Verify Stripe signature ──
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");
    console.log("[webhook] Received event, verifying signature...");

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

    // ── 2. Idempotency check (Read-Only) ──
    const existingEvent = await WebhookEvent.findOne({ stripe_event_id: event.id }).lean();
    if (existingEvent) {
        console.log(`[webhook] Duplicate event ${event.id} — skipping.`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    // ── 3. Route event ──
    try {
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(event);
                break;
            case "payment_intent.succeeded":
                await handlePaymentIntentSucceeded(event);
                break;
            default:
                console.log(`[webhook] Unhandled event type: ${event.type}`);
        }

        // ── 4. Commit Idempotency Record ──
        // Only mark this as processed if the handlers complete without crashing/terminating.
        await WebhookEvent.create({
            stripe_event_id: event.id,
            event_type: event.type,
            job_id: null,
            processed_at: new Date(),
        });
    } catch (error: any) {
        console.error(`[webhook] Handler error for ${event.type}:`, error.message);
        // Return 500 so Stripe retries. Idempotency guard above prevents double processing on the retry.
        return NextResponse.json({ error: "Internal handler error." }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

// ─── Metadata extraction ──────────────────────────────────────────────────────

function extractMetadata(metadata: Stripe.Metadata | null) {
    if (!metadata) return { jobId: null, accessToken: null, upsells: [] as string[], fromCheckoutSession: false };
    return {
        jobId: metadata.jobId ?? null,
        accessToken: metadata.accessToken ?? null,
        upsells: JSON.parse(metadata.upsells ?? "[]") as string[],
        fromCheckoutSession: metadata.fromCheckoutSession === "true",
    };
}

// ─── checkout.session.completed ──────────────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const { jobId, accessToken, upsells } = extractMetadata(session.metadata);

    if (!jobId || !accessToken) {
        console.error("[webhook] checkout.session.completed — missing jobId/accessToken in metadata");
        return;
    }

    // Tag PaymentIntent so payment_intent.succeeded knows to skip it
    if (session.payment_intent) {
        await stripe.paymentIntents.update(String(session.payment_intent), {
            metadata: { fromCheckoutSession: "true" },
        });
    }

    await confirmAndGenerate({
        jobId,
        accessToken,
        upsells,
        stripeSessionId: session.id,
        paymentIntentId: String(session.payment_intent ?? ""),
        amountTotal: session.amount_total ?? 0,
        currency: session.currency ?? "gbp",
    });
}

// ─── payment_intent.succeeded ─────────────────────────────────────────────────

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { jobId, accessToken, upsells, fromCheckoutSession } = extractMetadata(intent.metadata);

    // Skip — already handled by checkout.session.completed
    if (fromCheckoutSession) {
        console.log(`[webhook] payment_intent.succeeded ${intent.id} — Checkout Session flow, skipping.`);
        return;
    }

    if (!jobId || !accessToken) {
        console.log(`[webhook] payment_intent.succeeded ${intent.id} — no jobId metadata, skipping.`);
        return;
    }

    await confirmAndGenerate({
        jobId,
        accessToken,
        upsells,
        stripeSessionId: "",
        paymentIntentId: intent.id,
        amountTotal: intent.amount ?? 0,
        currency: intent.currency ?? "gbp",
    });
}

// ─── Core: confirm payment state + update JobPayment + trigger AI ─────────────

async function confirmAndGenerate({
    jobId,
    accessToken,
    upsells,
    stripeSessionId,
    paymentIntentId,
    amountTotal,
    currency,
}: {
    jobId: string;
    accessToken: string;
    upsells: string[];
    stripeSessionId: string;
    paymentIntentId: string;
    amountTotal: number;
    currency: string;
}) {
    // ── 1. Verify job exists and token matches ──
    const job = await Job.findOne({ _id: jobId, access_token: accessToken }).lean<any>();
    if (!job) {
        console.error(`[webhook] Job ${jobId} not found or token mismatch`);
        return;
    }

    // ── 2. Payment lock — job MUST be AWAITING_PAYMENT ──
    if (job.status !== JobState.AWAITING_PAYMENT) {
        console.warn(`[webhook] Job ${jobId} is '${job.status}' not AWAITING_PAYMENT — discarding.`);
        return;
    }

    // ── 3. Atomic state transition with DB-level lock ──
    // The status condition in the query acts as the lock — if two webhook
    // deliveries race, only one will match and update; the other gets null.
    const updated = await Job.findOneAndUpdate(
        { _id: jobId, status: JobState.AWAITING_PAYMENT },
        {
            $set: {
                status: JobState.PAYMENT_CONFIRMED,
                previous_state: JobState.AWAITING_PAYMENT,
                state_transitioned_at: new Date(),
                stripe_payment_intent_id: paymentIntentId,
                upsells_purchased: upsells,
            },
        },
        { new: true },
    );

    if (!updated) {
        console.warn(`[webhook] Job ${jobId} — race condition, state already advanced. Skipping.`);
        return;
    }

    // ── 4. Update the pending JobPayment record to "completed" ──
    const paymentDoc = await JobPayment.findOneAndUpdate(
        {
            job_id: jobId,
            status: "pending",
        },
        {
            $set: {
                stripe_payment_intent_id: paymentIntentId,
                stripe_session_id: stripeSessionId || job.stripe_session_id || "",
                amount: amountTotal,
                currency: currency.toLowerCase(),
                status: "completed",
                upsells_purchased: upsells,
            },
        },
        { new: true },
    );

    if (!paymentDoc) {
        console.warn(`[webhook] No pending JobPayment for job ${jobId} — creating fallback record.`);
        await JobPayment.create({
            job_id: jobId,
            stripe_session_id: stripeSessionId || job.stripe_session_id || "",
            stripe_payment_intent_id: paymentIntentId,
            amount: amountTotal,
            currency: currency.toLowerCase(),
            status: "completed",
            upsells_purchased: upsells,
            created_at: new Date(),
        });
    }

    console.log(`[webhook] JobPayment confirmed for job ${jobId} — amount: ${amountTotal} ${currency}`);

    // ── 5. Read extracted text from Temp ──
    const tempDoc = await Temp.findOne({ job_id: String(jobId) }).lean<any>();

    if (!tempDoc?.extracted_text) {
        console.error(`[webhook] No Temp text for job ${jobId} — marking FAILED`);
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FAILED,
            previous_state: JobState.PAYMENT_CONFIRMED,
            state_transitioned_at: new Date(),
        });
        await JobPayment.findOneAndUpdate({ job_id: jobId, stripe_payment_intent_id: paymentIntentId }, { $set: { status: "failed" } });
        return;
    }

    // ── 6. Trigger paid AI generation (Fire and Forget) ──
    // Because this is running on a VPS, we do NOT await this. We let it run in the
    // background so we can instantly return 200 OK to Stripe and prevent timeouts.
    console.log(`[webhook] Spawning background AI generation for job ${jobId}`);

    generatePaidBreakdown(jobId, tempDoc.extracted_text, upsells)
        .then(async () => {
            await Temp.deleteOne({ job_id: String(jobId) });
            console.log(`[webhook] Paid generation completed for job ${jobId}`);
        })
        .catch(async (error: any) => {
            console.error(`[webhook] Paid generation failed for job ${jobId}:`, error.message);
            await JobPayment.findOneAndUpdate({ job_id: jobId, stripe_payment_intent_id: paymentIntentId }, { $set: { status: "failed" } });
        });
}
