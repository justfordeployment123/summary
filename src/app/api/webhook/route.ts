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
        return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

    await dbConnect();

    // ── 2. Idempotency check (§7.1) ──
    // Store every received event ID. If we've seen it before, return 200 silently.
    const existingEvent = await WebhookEvent.findOne({
        stripe_event_id: event.id,
    }).lean();

    if (existingEvent) {
        // Already processed — return 200 to prevent Stripe from retrying
        console.log(`[webhook] Duplicate event ${event.id} — skipping.`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    // Record this event before processing to prevent race conditions
    await WebhookEvent.create({
        stripe_event_id: event.id,
        event_type: event.type,
        job_id: null, // updated below if we find the job
        processed_at: new Date(),
    });

    // ── 3. Handle relevant event types ──
    try {
        if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(event);
        } else if (event.type === "payment_intent.succeeded") {
            // Secondary handler — most of the work happens in checkout.session.completed
            console.log(`[webhook] payment_intent.succeeded: ${event.id}`);
        }
        // Other event types are acknowledged but not processed
    } catch (error: any) {
        console.error(`[webhook] Handler error for ${event.type}:`, error.message);
        // Return 500 so Stripe retries — idempotency guard above ensures no duplicate
        return NextResponse.json({ error: "Internal handler error." }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

// ─── Checkout Session Completed Handler ───────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.jobId;
    const accessToken = session.metadata?.accessToken;
    const upsells: string[] = JSON.parse(session.metadata?.upsells ?? "[]");

    if (!jobId || !accessToken) {
        console.error("[webhook] Missing jobId or accessToken in session metadata");
        return;
    }

    // Update webhook record with job_id
    await WebhookEvent.findOneAndUpdate({ stripe_event_id: event.id }, { job_id: jobId });

    // ── 4. Payment lock check (§7.2) ──
    // Job MUST be in AWAITING_PAYMENT. Any other state → discard.
    const job = await Job.findOne({
        _id: jobId,
        access_token: accessToken,
    }).lean<any>();

    if (!job) {
        console.error(`[webhook] Job ${jobId} not found`);
        return;
    }

    if (job.status !== JobState.AWAITING_PAYMENT) {
        console.warn(`[webhook] Job ${jobId} is in '${job.status}' — not AWAITING_PAYMENT. Discarding.`);
        return;
    }

    // ── 5. Atomic state update: AWAITING_PAYMENT → PAYMENT_CONFIRMED (§7.1) ──
    const updated = await Job.findOneAndUpdate(
        {
            _id: jobId,
            status: JobState.AWAITING_PAYMENT, // atomic check — prevents race
        },
        {
            status: JobState.PAYMENT_CONFIRMED,
            previous_state: JobState.AWAITING_PAYMENT,
            state_transitioned_at: new Date(),
            stripe_payment_intent_id: session.payment_intent,
        },
        { new: true },
    );

    if (!updated) {
        console.warn(`[webhook] Job ${jobId} state update race — skipping.`);
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

    // ── 7. Trigger paid AI generation (webhook-only, §7.2) ──
    try {
        await generatePaidBreakdown(jobId, tempDoc.extracted_text, upsells);
        // Clean up Temp document after successful paid generation
        await Temp.deleteOne({ job_id: String(jobId) });
    } catch (error: any) {
        console.error(`[webhook] Paid generation failed for ${jobId}:`, error.message);
    }
}
