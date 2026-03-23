// src/app/api/admin/jobs/[id]/refund/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const [job, payment] = await Promise.all([Job.findById(id), JobPayment.findOne({ job_id: id })]);

        if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
        if (!payment) return NextResponse.json({ error: "No payment record found for this job." }, { status: 404 });

        // Must have a payment intent to refund
        if (!payment.stripe_payment_intent_id) {
            return NextResponse.json({ error: "No Stripe payment intent ID on record — cannot issue refund." }, { status: 400 });
        }

        // Can't refund if already refunded
        if (job.status === "REFUNDED") {
            return NextResponse.json({ error: "Job is already refunded." }, { status: 409 });
        }

        // Issue full refund via Stripe
        const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
        });

        if (refund.status !== "succeeded" && refund.status !== "pending") {
            return NextResponse.json({ error: `Stripe refund failed with status: ${refund.status}` }, { status: 500 });
        }

        // Update job status to REFUNDED
        await Job.findByIdAndUpdate(id, {
            status: "REFUNDED",
            previous_state: job.status,
            state_transitioned_at: new Date(),
        });

        // Update payment record
        await JobPayment.findByIdAndUpdate(payment._id, {
            status: "refunded",
        });

        return NextResponse.json({
            success: true,
            refundId: refund.id,
            refundStatus: refund.status,
        });
    } catch (error: any) {
        console.error("[refund]", error);
        // Stripe errors have a `type` field — surface the message cleanly
        return NextResponse.json({ error: error?.message || "Failed to issue refund." }, { status: 500 });
    }
}
