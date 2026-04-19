// src/app/api/verify-payment/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";
import { confirmAndGenerate } from "@/lib/paymentService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(req: Request) {
    try {
        console.log("[verify-payment] Verification request received");

        const { jobId, accessToken, paymentIntentId } = await req.json();

        if (!jobId || !accessToken || !paymentIntentId) {
            return NextResponse.json({ error: "Missing fields." }, { status: 400 });
        }

        const job = await prisma.job.findFirst({
            where: { id: jobId, access_token: accessToken },
        });

        if (!job) {
            return NextResponse.json({ error: "Invalid job or token." }, { status: 403 });
        }

        // Trust Stripe, not the client
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== "succeeded") {
            return NextResponse.json({ verified: false, stripeStatus: intent.status });
        }

        // If webhook already handled it, nothing to do
        console.log(`[verify-payment] Checking job status for jobId: ${jobId}`);
        const terminalStates: JobState[] = [
            JobState.PAYMENT_CONFIRMED,
            JobState.PAID_BREAKDOWN_GENERATING,
            JobState.COMPLETED,
        ];
        if (terminalStates.includes(job.status)) {
            return NextResponse.json({ verified: true, alreadyProcessing: true });
        }

        // Webhook missed it — do the full job
        const upsells = intent.metadata?.upsells ? JSON.parse(intent.metadata.upsells) : [];
        console.log(
            `[verify-payment] Webhook likely missed event. Manually confirming and generating breakdown for jobId: ${jobId} with upsells:`,
            upsells,
        );

        await confirmAndGenerate({
            jobId,
            accessToken,
            upsells,
            stripeSessionId: intent.metadata?.stripeSessionId ?? "",
            paymentIntentId: intent.id,
            amountTotal: intent.amount ?? 0,
            currency: intent.currency ?? "gbp",
        });

        return NextResponse.json({ verified: true, alreadyProcessing: false });
    } catch (err: any) {
        console.error("[verify-payment]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}