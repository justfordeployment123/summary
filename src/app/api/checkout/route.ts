import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";
import { JobStateLog } from "@/models/JobStateLog";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover", // The version your SDK expects
});

export async function POST(request: Request) {
    try {
        const { jobId, upsells } = await request.json();

        if (!jobId) {
            return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
        }

        await dbConnect();
        const job = await Job.findById(jobId);

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Base price for the Detailed Breakdown (e.g., £4.99)
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: "Detailed Letter Breakdown",
                        description: "Full, section-by-section plain English explanation.",
                    },
                    unit_amount: 499, // Amount in pennies (£4.99)
                },
                quantity: 1,
            },
        ];

        // Add optional upsells if the user selected them
        if (upsells?.includes("legal_formatting")) {
            lineItems.push({
                price_data: {
                    currency: "gbp",
                    product_data: { name: "Legal Formatting Output" },
                    unit_amount: 199, // £1.99
                },
                quantity: 1,
            });
        }

        if (upsells?.includes("tone_rewrite")) {
            lineItems.push({
                price_data: {
                    currency: "gbp",
                    product_data: { name: "Professional Tone Rewrite" },
                    unit_amount: 299, // £2.99
                },
                quantity: 1,
            });
        }

        // Create the Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            // Pass the Job ID in the metadata so our Webhook knows what job to process!
            metadata: {
                jobId: job._id.toString(),
                upsells: JSON.stringify(upsells || []),
            },
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?job_id=${job._id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=true`,
        });

        // Advance State: FREE_SUMMARY_COMPLETE -> AWAITING_PAYMENT
        job.previous_state = job.status;
        job.status = JobState.AWAITING_PAYMENT;
        job.state_transitioned_at = new Date();
        // Save the chosen upsells to the DB for later
        job.selected_upsells = upsells || [];
        await job.save();

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.FREE_SUMMARY_COMPLETE,
            to_state: JobState.AWAITING_PAYMENT,
            triggered_by: "system_checkout_route",
        });

        // Return the secure Stripe URL to the frontend
        return NextResponse.json({ url: session.url }, { status: 200 });
    } catch (error: any) {
        console.error("Checkout Error:", error);
        return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}
