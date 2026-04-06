// src/app/api/webhook/route.ts

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
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        console.error("🚨 [webhook] Missing stripe-signature header");
        return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
        console.error("🚨 [webhook] Invalid signature:", err.message);
        return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
    }

    await dbConnect();

    // ── 1. Idempotency check ──
    const existingEvent = await WebhookEvent.findOne({ stripe_event_id: event.id }).lean();
    if (existingEvent) {
        console.log(`🟢 [webhook] Duplicate event ${event.id} — skipping (Idempotent success).`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    try {
        // ── Extract JobId early for the Idempotency Record ──
        const stripeObj = event.data.object as any;
        const { jobId: extractedJobId } = extractMetadata(stripeObj?.metadata || null);

        // ── 2. Route event ──
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(event);
                break;
            case "payment_intent.succeeded":
                await handlePaymentIntentSucceeded(event);
                break;
            default:
                console.log(`🟡 [webhook] Unhandled event type: ${event.type}`);
        }

        // ── 3. Commit Idempotency Record (Only if handlers succeeded) ──
        await WebhookEvent.create({
            stripe_event_id: event.id,
            event_type: event.type,
            job_id: extractedJobId, // 🚨 Now properly passing the extracted jobId!
            processed_at: new Date(),
        });

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error(`🚨 [webhook] Handler error for ${event.type}:`, error.message);
        const status = error.message.includes("Validation") || error.message.includes("Data") ? 400 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

// ─── Metadata extraction ──────────────────────────────────────────────────────

function extractMetadata(metadata: Stripe.Metadata | null) {
    if (!metadata) return { jobId: null, accessToken: null, upsells: [] as string[], fromCheckoutSession: false };
    return {
        jobId: metadata.jobId ?? null,
        accessToken: metadata.accessToken ?? null,
        upsells: metadata.upsells ? JSON.parse(metadata.upsells) : [],
        fromCheckoutSession: metadata.fromCheckoutSession === "true",
    };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const { jobId, accessToken, upsells } = extractMetadata(session.metadata);

    if (!jobId || !accessToken) {
        throw new Error("Validation Error: Missing jobId or accessToken in checkout session metadata.");
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

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { jobId, accessToken, upsells, fromCheckoutSession } = extractMetadata(intent.metadata);

    if (fromCheckoutSession) {
        // This is safe because your checkout route now explicitly passes this down.
        console.log(`🔵 [webhook] payment_intent.succeeded ${intent.id} — Handled by Checkout Session, skipping.`);
        return;
    }

    if (!jobId || !accessToken) {
        throw new Error(`Validation Error: Missing jobId or accessToken in payment intent metadata (${intent.id}).`);
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

// ─── Core Logic ───────────────────────────────────────────────────────────────

async function confirmAndGenerate({ jobId, accessToken, upsells, stripeSessionId, paymentIntentId, amountTotal, currency }: any) {
    // 1. Verify Job & Token
    const job = await Job.findOne({ _id: jobId, access_token: accessToken }).lean<any>();
    if (!job) {
        throw new Error(`Validation Error: Job ${jobId} not found or token mismatch.`);
    }

    // 2. State Lock
    if (job.status === JobState.PAYMENT_CONFIRMED || job.status === JobState.PAID_BREAKDOWN_GENERATING || job.status === JobState.COMPLETED) {
        console.log(`🟢 [webhook] Job ${jobId} is already processing or completed. Idempotent success.`);
        return;
    }

    if (job.status !== JobState.AWAITING_PAYMENT) {
        throw new Error(`State Error: Job ${jobId} is in state '${job.status}', expected AWAITING_PAYMENT.`);
    }

    // 3. Atomic State Update
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
        throw new Error(`State Error: Race condition detected. Job ${jobId} state changed during processing.`);
    }

    // 4. Upsert JobPayment
    await JobPayment.findOneAndUpdate(
        { job_id: jobId },
        {
            $set: {
                stripe_payment_intent_id: paymentIntentId,
                stripe_session_id: stripeSessionId || job.stripe_session_id || "",
                amount: amountTotal,
                currency: currency.toLowerCase(),
                status: "completed",
                upsells_purchased: upsells,
            },
            $setOnInsert: { created_at: new Date() },
        },
        { new: true, upsert: true },
    );

    // 5. Get Extracted Text
    const tempDoc = await Temp.findOne({ job_id: String(jobId) }).lean<any>();
    if (!tempDoc?.extracted_text) {
        await Job.findByIdAndUpdate(jobId, { status: JobState.FAILED });
        await JobPayment.findOneAndUpdate({ job_id: jobId, stripe_payment_intent_id: paymentIntentId }, { $set: { status: "failed" } });
        throw new Error(`Data Error: No extracted text found in Temp for job ${jobId}. Marked as FAILED.`);
    }

    // 6. Fire and Forget AI Task
    console.log(`🚀 [webhook] Spawning background AI generation for job ${jobId}`);
    generatePaidBreakdown(jobId, tempDoc.extracted_text, upsells)
        .then(async () => {
            // Clean up temp storage once processing finishes successfully
            await Temp.deleteOne({ job_id: String(jobId) });
            console.log(`✅ [webhook] Paid generation completed for job ${jobId}`);
        })
        .catch(async (error: any) => {
            console.error(`🚨 [webhook] AI generation failed for job ${jobId}:`, error.message);
            await JobPayment.findOneAndUpdate({ job_id: jobId, stripe_payment_intent_id: paymentIntentId }, { $set: { status: "failed" } });
        });
}
