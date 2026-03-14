import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { Category } from "@/models/Category";
import { JobPayment } from "@/models/JobPayment";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover" as any, // Cast to any if TS complains about the future API version
});

export async function POST(request: Request) {
    try {
        // 1. ADDED accessToken to the destructured body
        const { jobId, accessToken, upsells, disclaimerAcknowledged } = await request.json();

        // 2. Validate token presence
        if (!jobId || !accessToken || !disclaimerAcknowledged) {
            return NextResponse.json({ error: "Missing required parameters or disclaimer not acknowledged" }, { status: 400 });
        }

        await dbConnect();

        const job = await Job.findById(jobId);
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Security check: Ensure the token matches the database (Optional but recommended)
        if (job.access_token !== accessToken) {
            return NextResponse.json({ error: "Invalid access token" }, { status: 403 });
        }

        const category = await Category.findOne({ name: job.category_name });
        const basePrice = category ? category.base_price : 499;

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: "Detailed Letter Breakdown",
                        description: `Full explanation for your ${job.category_name || "document"}.`,
                    },
                    unit_amount: basePrice,
                },
                quantity: 1,
            },
        ];

        let totalAmount = basePrice;

        if (upsells?.includes("legal_formatting")) {
            lineItems.push({
                price_data: { currency: "gbp", product_data: { name: "Legal Formatting Output" }, unit_amount: 199 },
                quantity: 1,
            });
            totalAmount += 199;
        }

        if (upsells?.includes("tone_rewrite")) {
            lineItems.push({
                price_data: { currency: "gbp", product_data: { name: "Professional Tone Rewrite" }, unit_amount: 299 },
                quantity: 1,
            });
            totalAmount += 299;
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            metadata: {
                jobId: job._id.toString(),
                upsells: JSON.stringify(upsells || []),
            },
            // 3. THE CRITICAL FIX: Append the token to the success URL
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?job_id=${job._id}&token=${accessToken}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=true`,
        });

        job.disclaimer_acknowledged = true;
        job.disclaimer_acknowledged_at = new Date();
        job.previous_state = job.status;
        job.status = JobState.AWAITING_PAYMENT;
        job.state_transitioned_at = new Date();
        await job.save();

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.FREE_SUMMARY_COMPLETE,
            to_state: JobState.AWAITING_PAYMENT,
            triggered_by: "system_checkout_route",
        });

        await JobPayment.create({
            job_id: job._id,
            stripe_session_id: session.id,
            amount: totalAmount,
            currency: "gbp",
            status: "pending",
            upsells_purchased: upsells || [],
        });

        return NextResponse.json({ url: session.url }, { status: 200 });
    } catch (error: any) {
        console.error("Checkout Error:", error);
        return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}
