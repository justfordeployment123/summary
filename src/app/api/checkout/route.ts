import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { Category } from "@/models/Category";
import { JobPayment } from "@/models/JobPayment";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
});

export async function POST(request: Request) {
    try {
        const { jobId, upsells, disclaimerAcknowledged } = await request.json();

        if (!jobId || !disclaimerAcknowledged) {
            return NextResponse.json({ error: "Missing required parameters or disclaimer not acknowledged" }, { status: 400 });
        }

        await dbConnect();

        // 1. Fetch the Job and the associated Category for dynamic pricing
        const job = await Job.findById(jobId);
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Assuming job has a category_name or category_id. We'll look it up.
        // If you don't have categories seeded in your DB yet, we fallback to 499 for testing.
        const category = await Category.findOne({ name: job.category_name });
        const basePrice = category ? category.base_price : 499;

        // 2. Build Stripe Line Items
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

        // Dynamic Upsells (You can also fetch these from an Upsell model later)
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

        // 3. Create Stripe Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            metadata: {
                jobId: job._id.toString(),
                upsells: JSON.stringify(upsells || []),
            },
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?job_id=${job._id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=true`,
        });

        // 4. Update the `jobs` table
        job.disclaimer_acknowledged = true;
        job.disclaimer_acknowledged_at = new Date();
        job.previous_state = job.status;
        job.status = JobState.AWAITING_PAYMENT;
        job.state_transitioned_at = new Date();
        await job.save();

        // 5. Log the state change
        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.FREE_SUMMARY_COMPLETE,
            to_state: JobState.AWAITING_PAYMENT,
            triggered_by: "system_checkout_route",
        });

        // 6. Create the `job_payments` record (Status: pending)
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
