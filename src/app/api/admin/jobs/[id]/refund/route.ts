import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover" as any,
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const job = await Job.findById(id);
        const payment = await JobPayment.findOne({ job_id: id });

        if (!job || !payment) {
            return NextResponse.json({ error: "Job or payment record not found" }, { status: 404 });
        }

        if (!payment.stripe_payment_intent_id) {
            return NextResponse.json({ error: "No Stripe Payment Intent ID found. Cannot refund via API." }, { status: 400 });
        }

        if (job.status === JobState.REFUNDED) {
            return NextResponse.json({ error: "Job is already refunded" }, { status: 400 });
        }

        // 1. Issue the refund via Stripe API
        await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
        });

        // 2. Update Job State (Revokes download access per reqs)
        job.previous_state = job.status;
        job.status = JobState.REFUNDED;
        job.state_transitioned_at = new Date();
        await job.save();

        // 3. Update Payment Record
        payment.status = "refunded";
        await payment.save();

        // 4. Log the state transition
        await JobStateLog.create({
            job_id: job._id,
            from_state: job.previous_state,
            to_state: JobState.REFUNDED,
            triggered_by: "admin_refund",
        });

        return NextResponse.json({ message: "Refund processed successfully" });
    } catch (error: any) {
        console.error("Refund Error:", error);
        return NextResponse.json({ error: error.message || "Failed to process refund" }, { status: 500 });
    }
}
