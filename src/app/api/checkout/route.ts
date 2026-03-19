// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckoutBody {
    jobId: string;
    accessToken: string;
    upsells: string[];
    disclaimerAcknowledged: boolean;
    successUrl?: string;
    cancelUrl?: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body: CheckoutBody = await req.json();
        const { jobId, accessToken, upsells = [], disclaimerAcknowledged, successUrl, cancelUrl } = body;

        // ── 1. Validate disclaimer acknowledgement server-side (§13.2) ──
        if (!disclaimerAcknowledged) {
            return NextResponse.json({ error: "You must acknowledge the disclaimer before proceeding." }, { status: 400 });
        }

        // ── 2. Validate inputs ──
        if (!jobId || !accessToken) {
            return NextResponse.json({ error: "Missing required fields: jobId, accessToken." }, { status: 400 });
        }

        // ── 3. Retrieve job & verify token (URL manipulation protection, §7.3) ──
        const job = await Job.findOne({ _id: jobId, access_token: accessToken }).populate("category_id").lean<any>();

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        // ── 4. Job must be FREE_SUMMARY_COMPLETE or AWAITING_PAYMENT to proceed ──
        if (job.status !== JobState.FREE_SUMMARY_COMPLETE && job.status !== JobState.AWAITING_PAYMENT) {
            return NextResponse.json(
                {
                    error: `Cannot create checkout session — job is in '${job.status}' state. Expected FREE_SUMMARY_COMPLETE or AWAITING_PAYMENT.`,
                },
                { status: 409 },
            );
        }

        // ── 5. Build Stripe line items ──
        const category = job.category_id as any;
        const basePrice: number = category?.base_price ?? 499; // pence

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: "Detailed Letter Breakdown",
                        description: `Section-by-section breakdown for: ${category?.name ?? "Letter"}`,
                    },
                    unit_amount: basePrice,
                },
                quantity: 1,
            },
        ];

        // ── 6. Add upsell line items ──
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
                    lineItems.push({
                        price_data: {
                            currency: "gbp",
                            product_data: {
                                name: upsell.name,
                                description: upsell.description ?? undefined,
                            },
                            unit_amount: price,
                        },
                        quantity: 1,
                    });
                }
            }
        }

        // ── 7. Resolve success / cancel URLs ──
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const finalSuccessUrl = successUrl ?? `${appUrl}/?job_id=${jobId}&token=${accessToken}&returning=1`;
        const finalCancelUrl = cancelUrl ?? `${appUrl}/`;

        // ── 8. Create Stripe Checkout Session ──
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: lineItems,
            success_url: finalSuccessUrl,
            cancel_url: finalCancelUrl,
            automatic_tax: { enabled: false }, // Stripe Tax — must be enabled in dashboard (§14.1)
            payment_method_types: ["card"], // Apple Pay, Google Pay, Link auto-enabled
            metadata: {
                jobId: String(jobId),
                accessToken,
                upsells: JSON.stringify(upsells),
            },
            payment_intent_data: {
                metadata: {
                    jobId: String(jobId),
                    disclaimerAcknowledged: "true",
                },
            },
        });

        // ── 9. Transition job to AWAITING_PAYMENT ──
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
