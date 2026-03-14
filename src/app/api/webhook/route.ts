import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { WebhookEvent } from "@/models/WebhookEvent";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        await dbConnect();

        // 1. Idempotency Check
        const existingEvent = await WebhookEvent.findOne({ stripe_event_id: event.id });
        if (existingEvent) {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // 2. Lock the event immediately to prevent duplicate processing on Stripe retries
        await WebhookEvent.create({
            stripe_event_id: event.id,
            event_type: event.type,
            job_id: event.type === "checkout.session.completed" ? (event.data.object as Stripe.Checkout.Session).metadata?.jobId : undefined,
        });

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const jobId = session.metadata?.jobId;

            if (jobId) {
                const job = await Job.findById(jobId);

                if (job && job.status === JobState.AWAITING_PAYMENT) {
                    // Update Job State
                    job.previous_state = job.status;
                    job.status = JobState.PAYMENT_CONFIRMED;
                    job.state_transitioned_at = new Date();
                    await job.save();

                    // Log the state change
                    await JobStateLog.create({
                        job_id: job._id,
                        from_state: JobState.AWAITING_PAYMENT,
                        to_state: JobState.PAYMENT_CONFIRMED,
                        triggered_by: "stripe_webhook",
                    });

                    // Update the JobPayment record to 'completed'
                    await JobPayment.findOneAndUpdate(
                        { stripe_session_id: session.id },
                        {
                            status: "completed",
                            stripe_payment_intent_id: session.payment_intent as string,
                        },
                    );

                    console.log(`Payment confirmed for Job: ${jobId}. Triggering AI...`);

                    // 3. THE CRITICAL FIX: We MUST await this fetch!
                    // This forces Next.js to keep the route alive until OpenAI finishes generating the markdown.
                    try {
                        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/generate-paid`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ jobId: job._id }),
                        });
                        console.log("AI Generation completed successfully.");
                    } catch (err) {
                        console.error("Failed to trigger AI generation from webhook:", err);
                    }
                }
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }
}
