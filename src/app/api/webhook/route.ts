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
import { confirmAndGenerate } from "@/lib/paymentService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");
    console.log("[webhook] Received event with headers:", {
        "stripe-signature": sig,
    });

    if (!sig) {
        return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
        console.error("[webhook] Signature verification failed:", err.message);
        return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
    }

    await dbConnect();
    console.log(`[webhook] Processing event ${event.type} (${event.id}) `);
    // Idempotency — if we've seen this event before, return early
    const alreadyProcessed = await WebhookEvent.findOne({ stripe_event_id: event.id }).lean();
    if (alreadyProcessed) {
        return NextResponse.json({ received: true, duplicate: true });
    }

    const stripeObj = event.data.object as any;
    const meta = extractMetadata(stripeObj?.metadata ?? null);

    try {
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(event);
                break;
            case "payment_intent.succeeded":

                await handlePaymentIntentSucceeded(event);
                break;
            default:
                // Unrecognised events are not an error — just acknowledge them
                break;
        }

        await WebhookEvent.create({
            stripe_event_id: event.id,
            event_type: event.type,
            job_id: meta.jobId,
            processed_at: new Date(),
        });

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error(`[webhook] Handler failed for ${event.type} (${event.id}):`, err.message);

        // 4xx → don't retry (bad data). 5xx → Stripe will retry.
        const status = err.message.startsWith("Validation:") ? 400 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

function extractMetadata(metadata: Stripe.Metadata | null) {
    return {
        jobId:             metadata?.jobId       ?? null,
        accessToken:       metadata?.accessToken ?? null,
        upsells:           metadata?.upsells ? (JSON.parse(metadata.upsells) as string[]) : [] as string[],
        fromCheckoutSession: metadata?.fromCheckoutSession === "true",
    };
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const { jobId, accessToken, upsells } = extractMetadata(session.metadata);

    if (!jobId || !accessToken) {
        throw new Error("Validation: Missing jobId or accessToken in checkout session metadata.");
    }

    await confirmAndGenerate({
        jobId,
        accessToken,
        upsells,
        stripeSessionId:   session.id,
        paymentIntentId:   String(session.payment_intent ?? ""),
        amountTotal:       session.amount_total ?? 0,
        currency:          session.currency ?? "gbp",
    });
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { jobId, accessToken, upsells, fromCheckoutSession } = extractMetadata(intent.metadata);

    // Payment intents created by a Checkout Session are handled by
    // checkout.session.completed — processing them here would duplicate work.
    if (fromCheckoutSession) return;

    if (!jobId || !accessToken) {
        throw new Error(`Validation: Missing jobId or accessToken in payment_intent metadata (${intent.id}).`);
    }

    await confirmAndGenerate({
        jobId,
        accessToken,
        upsells,
        stripeSessionId:  "",
        paymentIntentId:  intent.id,
        amountTotal:      intent.amount ?? 0,
        currency:         intent.currency ?? "gbp",
    });
}
