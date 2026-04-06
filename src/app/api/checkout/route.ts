// src/app/api/checkout/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

interface CheckoutBody {
    jobId: string;
    accessToken: string;
    upsells: string[];
    disclaimerAcknowledged: boolean;
    successUrl?: string;
    cancelUrl?: string;
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body: CheckoutBody = await req.json();
        const { jobId, accessToken, upsells = [], disclaimerAcknowledged, successUrl, cancelUrl } = body;

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
        if (job.status !== JobState.FREE_SUMMARY_COMPLETE && job.status !== JobState.AWAITING_PAYMENT) {
            return NextResponse.json({ error: `Cannot checkout — job is in '${job.status}' state.` }, { status: 409 });
        }

        // ── 4. Build line items & calculate total server-side ──
        const category = job.category_id as any;
        const basePrice: number = category?.base_price ?? 499;
        let totalAmount = basePrice;

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: "Detailed Letter Breakdown",
                        description: `Full breakdown for: ${category?.name ?? "Letter"}`,
                    },
                    unit_amount: basePrice,
                },
                quantity: 1,
            },
        ];

        if (upsells.length > 0) {
            const Upsell = (await import("@/models/Upsell")).default;
            const upsellDocs = await Upsell.find({ _id: { $in: upsells }, is_active: true }).lean<any[]>();
            const categoryId = String(category?._id ?? job.category_id);

            for (const upsell of upsellDocs) {
                const price: number = upsell.category_prices?.[categoryId] ?? 0;
                if (price > 0) {
                    totalAmount += price;
                    lineItems.push({
                        price_data: {
                            currency: "gbp",
                            product_data: { name: upsell.name, description: upsell.description ?? undefined },
                            unit_amount: price,
                        },
                        quantity: 1,
                    });
                }
            }
        }

        // ── 5. Create Stripe Checkout Session ──
        // ── 5. Create Stripe Checkout Session ──
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: lineItems,
            success_url: successUrl ?? `${appUrl}/?job_id=${jobId}&token=${accessToken}&returning=1`,
            cancel_url: cancelUrl ?? `${appUrl}/`,
            automatic_tax: { enabled: false },
            payment_method_types: ["card"],

            // Session Metadata
            metadata: {
                jobId: String(jobId),
                accessToken: String(accessToken),
                upsells: JSON.stringify(upsells),
                fromCheckoutSession: "true",
            },

            // 🚨 CRITICAL: This must match the webhook requirements exactly!
            payment_intent_data: {
                metadata: {
                    jobId: String(jobId),
                    accessToken: String(accessToken), // <-- Added this
                    upsells: JSON.stringify(upsells), // <-- Added this
                    fromCheckoutSession: "true", // <-- Added this to prevent duplicate processing
                },
            },
        });
        // ── 6. Upsert a PENDING JobPayment record ──
        // The webhook will update this to "completed" once payment is confirmed.
        // Using upsert so re-visiting checkout doesn't create duplicate records.
        await JobPayment.findOneAndUpdate(
            { job_id: jobId },
            {
                $set: {
                    stripe_session_id: session.id,
                    stripe_payment_intent_id: null,
                    amount: totalAmount,
                    currency: "gbp",
                    status: "pending",
                    upsells_purchased: upsells,
                },
                $setOnInsert: {
                    job_id: jobId,
                    created_at: new Date(),
                },
            },
            { upsert: true },
        );

        // ── 7. Transition job to AWAITING_PAYMENT ──
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.AWAITING_PAYMENT,
            previous_state: job.status,
            state_transitioned_at: new Date(),
            disclaimer_acknowledged: true,
            disclaimer_acknowledged_at: new Date(),
            stripe_session_id: session.id,
            upsells_purchased: upsells,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("[checkout]", error);
        return NextResponse.json({ error: error.message || "Failed to create checkout session." }, { status: 500 });
    }
}
