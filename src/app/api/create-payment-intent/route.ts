// src/app/api/create-payment-intent/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

interface CreatePaymentIntentBody {
    jobId: string;
    accessToken: string;
    upsells: string[];
    disclaimerAcknowledged: boolean;
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body: CreatePaymentIntentBody = await req.json();
        const { jobId, accessToken, upsells = [], disclaimerAcknowledged } = body;

        // ── 1. Validate disclaimer server-side (§13.2) ──
        if (!disclaimerAcknowledged) {
            return NextResponse.json({ error: "You must acknowledge the disclaimer before proceeding." }, { status: 400 });
        }

        if (!jobId || !accessToken) {
            return NextResponse.json({ error: "Missing required fields: jobId, accessToken." }, { status: 400 });
        }

        // ── 2. Retrieve job & verify token (§7.3) ──
        const job = await Job.findOne({ _id: jobId, access_token: accessToken }).populate("category_id").lean<any>();

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        // ── 3. State guard ──
        const allowedStates: string[] = [JobState.FREE_SUMMARY_COMPLETE, JobState.AWAITING_PAYMENT];
        if (!allowedStates.includes(job.status)) {
            return NextResponse.json({ error: `Cannot create payment intent — job is in '${job.status}' state.` }, { status: 409 });
        }

        // ── 4. Re-use existing intent if job is already AWAITING_PAYMENT ──
        // Prevents creating duplicate intents when user refreshes the payment page.
        if (job.status === JobState.AWAITING_PAYMENT && job.stripe_payment_intent_id) {
            try {
                const existing = await stripe.paymentIntents.retrieve(job.stripe_payment_intent_id);
                if (existing.status !== "succeeded" && existing.status !== "canceled") {
                    return NextResponse.json({ clientSecret: existing.client_secret });
                }
            } catch {
                // Intent gone — fall through and create a new one
            }
        }

        // ── 5. Calculate total server-side (never trust client amounts) ──
        const category = job.category_id as any;
        const basePrice: number = category?.base_price ?? 499;
        let totalAmount = basePrice;
        const purchasedUpsellIds: string[] = [];

        if (upsells.length > 0) {
            const Upsell = (await import("@/models/Upsell")).default;
            const upsellDocs = await Upsell.find({ _id: { $in: upsells }, is_active: true }).lean<any[]>();
            const categoryId = String(category?._id ?? job.category_id);

            for (const upsell of upsellDocs) {
                const price: number = upsell.category_prices?.[categoryId] ?? 0;
                if (price > 0) {
                    totalAmount += price;
                    purchasedUpsellIds.push(String(upsell._id));
                }
            }
        }

        // ── 6. Create Stripe PaymentIntent ──
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: "gbp",
            automatic_payment_methods: { enabled: true },
            metadata: {
                jobId: String(jobId),
                accessToken,
                upsells: JSON.stringify(purchasedUpsellIds),
                disclaimerAcknowledged: "true",
            },
            description: `ExplainMyLetter — ${category?.name ?? "Letter"} breakdown`,
        });

        // ── 7. Upsert a PENDING JobPayment record ──
        // The webhook updates this to "completed" on payment_intent.succeeded.
        // Using upsert so re-opening the payment form doesn't create duplicates.
        await JobPayment.findOneAndUpdate(
            { job_id: jobId },
            {
                $set: {
                    stripe_session_id: "", // no session in Elements flow
                    stripe_payment_intent_id: paymentIntent.id,
                    amount: totalAmount,
                    currency: "gbp",
                    status: "pending",
                    upsells_purchased: purchasedUpsellIds,
                },
                $setOnInsert: {
                    job_id: jobId,
                    created_at: new Date(),
                },
            },
            { upsert: true },
        );

        // ── 8. Transition job to AWAITING_PAYMENT ──
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.AWAITING_PAYMENT,
            previous_state: job.status,
            state_transitioned_at: new Date(),
            disclaimer_acknowledged: true,
            disclaimer_acknowledged_at: new Date(),
            stripe_payment_intent_id: paymentIntent.id,
            upsells_purchased: purchasedUpsellIds,
        });

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
        console.error("[create-payment-intent]", error);
        return NextResponse.json({ error: error.message || "Failed to create payment intent." }, { status: 500 });
    }
}
