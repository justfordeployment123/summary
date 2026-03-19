// src/app/api/create-payment-intent/route.ts
//
// Creates a Stripe PaymentIntent for the embedded Stripe Elements flow.
// This replaces the hosted Checkout Session redirect with an inline payment form.
//
// Security requirements preserved from §7:
//   • disclaimerAcknowledged validated server-side before creating intent (§13.2)
//   • Job token + state validation (§7.3)
//   • Job must be FREE_SUMMARY_COMPLETE or AWAITING_PAYMENT
//   • Transitions job to AWAITING_PAYMENT + stores intent ID atomically
//   • Upsell prices re-validated server-side (never trust client amounts)
//   • PaymentIntent metadata carries jobId + accessToken for webhook matching
//
// The webhook (checkout/webhook/route.ts) handles payment_intent.succeeded
// and is the ONLY trigger for paid AI generation (§7.2).

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatePaymentIntentBody {
    jobId: string;
    accessToken: string;
    upsells: string[]; // array of upsell _id strings
    disclaimerAcknowledged: boolean;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body: CreatePaymentIntentBody = await req.json();
        const { jobId, accessToken, upsells = [], disclaimerAcknowledged } = body;

        // ── 1. Validate disclaimer acknowledgement server-side (§13.2) ──
        if (!disclaimerAcknowledged) {
            return NextResponse.json({ error: "You must acknowledge the disclaimer before proceeding." }, { status: 400 });
        }

        // ── 2. Validate required fields ──
        if (!jobId || !accessToken) {
            return NextResponse.json({ error: "Missing required fields: jobId, accessToken." }, { status: 400 });
        }

        // ── 3. Retrieve job & verify access token (URL manipulation protection, §7.3) ──
        const job = await Job.findOne({
            _id: jobId,
            access_token: accessToken,
        })
            .populate("category_id")
            .lean<any>();

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        // ── 4. Job state guard — must be FREE_SUMMARY_COMPLETE or AWAITING_PAYMENT ──
        // AWAITING_PAYMENT is allowed so the user can re-open the payment form
        // (e.g. closed the tab and came back) without creating a duplicate intent.
        const allowedStates: string[] = [JobState.FREE_SUMMARY_COMPLETE, JobState.AWAITING_PAYMENT];

        if (!allowedStates.includes(job.status)) {
            return NextResponse.json(
                {
                    error: `Cannot create payment intent — job is in '${job.status}' state. Expected FREE_SUMMARY_COMPLETE or AWAITING_PAYMENT.`,
                },
                { status: 409 },
            );
        }

        // ── 5. If job already has a PaymentIntent and is still AWAITING_PAYMENT,
        //       re-use it so we don't create duplicates on page reload ──
        if (job.status === JobState.AWAITING_PAYMENT && job.stripe_payment_intent_id) {
            try {
                const existingIntent = await stripe.paymentIntents.retrieve(job.stripe_payment_intent_id);

                // Only re-use if it hasn't been paid yet
                if (existingIntent.status !== "succeeded" && existingIntent.status !== "canceled") {
                    return NextResponse.json({ clientSecret: existingIntent.client_secret });
                }
            } catch {
                // Intent retrieval failed — fall through and create a new one
            }
        }

        // ── 6. Calculate total amount server-side (never trust client amounts) ──
        const category = job.category_id as any;
        const basePrice: number = category?.base_price ?? 499; // pence

        let totalAmount = basePrice;
        const purchasedUpsellIds: string[] = [];

        if (upsells.length > 0) {
            const Upsell = (await import("@/models/Upsell")).default;
            const upsellDocs = await Upsell.find({
                _id: { $in: upsells },
                is_active: true,
            }).lean<any[]>();

            const categoryId = String(category?._id ?? job.category_id);

            for (const upsell of upsellDocs) {
                const price: number = upsell.category_prices?.[categoryId] ?? 0;
                if (price > 0) {
                    totalAmount += price;
                    purchasedUpsellIds.push(String(upsell._id));
                }
            }
        }

        // ── 7. Create Stripe PaymentIntent ──
        // metadata carries jobId + accessToken so the webhook can identify the job
        // without needing a session lookup (mirrors what checkout/route.ts does via
        // session metadata, but for the PaymentIntent-based flow).
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: "gbp",
            automatic_payment_methods: { enabled: true }, // enables Card, Apple Pay, Google Pay, Link
            metadata: {
                jobId: String(jobId),
                accessToken,
                upsells: JSON.stringify(purchasedUpsellIds),
                disclaimerAcknowledged: "true",
            },
            description: `ExplainMyLetter — ${category?.name ?? "Letter"} breakdown`,
        });

        // ── 8. Transition job to AWAITING_PAYMENT + store intent ID (atomic) ──
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.AWAITING_PAYMENT,
            previous_state: job.status,
            state_transitioned_at: new Date(),
            disclaimer_acknowledged: true,
            disclaimer_acknowledged_at: new Date(),
            stripe_payment_intent_id: paymentIntent.id,
            upsells_purchased: purchasedUpsellIds,
        });

        // ── 9. Return client secret to the frontend ──
        // The client passes this to <Elements> which renders the payment form.
        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
        console.error("[create-payment-intent]", error);
        return NextResponse.json({ error: error.message || "Failed to create payment intent." }, { status: 500 });
    }
}
