import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { WebhookEvent } from "@/models/WebhookEvent";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
    try {
        // 1. Get the raw text body and the Stripe signature header
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
        }

        let event: Stripe.Event;

        // 2. Cryptographically verify that this request actually came from Stripe
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        await dbConnect();

        // 3. Idempotency Check: Have we processed this exact event already?
        const existingEvent = await WebhookEvent.findOne({ stripe_event_id: event.id });
        if (existingEvent) {
            console.log(`Event ${event.id} already processed. Skipping.`);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // We only care about successful checkout sessions right now
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const jobId = session.metadata?.jobId;

            if (jobId) {
                const job = await Job.findById(jobId);

                if (job) {
                    // A. Update the Job State
                    job.previous_state = job.status;
                    job.status = JobState.PAYMENT_CONFIRMED;
                    job.state_transitioned_at = new Date();
                    await job.save();

                    // B. Log the state change
                    await JobStateLog.create({
                        job_id: job._id,
                        from_state: JobState.AWAITING_PAYMENT,
                        to_state: JobState.PAYMENT_CONFIRMED,
                        triggered_by: "stripe_webhook",
                    });

                    // C. Update the JobPayment record to completed
                    await JobPayment.findOneAndUpdate(
                        { stripe_session_id: session.id },
                        {
                            status: "completed",
                            stripe_payment_intent_id: session.payment_intent as string,
                        },
                    );

                    console.log(`Payment confirmed for Job: ${jobId}`);

                    // NOTE: This is where we will trigger the final OpenAI Detailed Breakdown generation!
                }
            }
        }

        // 4. Record the event so we never process it twice
        await WebhookEvent.create({
            stripe_event_id: event.id,
            event_type: event.type,
            job_id: event.type === "checkout.session.completed" ? (event.data.object as Stripe.Checkout.Session).metadata?.jobId : undefined,
        });

        // Always return a 200 quickly so Stripe knows we got it
        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }
}
