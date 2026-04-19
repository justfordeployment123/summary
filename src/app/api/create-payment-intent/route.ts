// src/app/api/create-payment-intent/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

interface CreatePaymentIntentBody {
    jobId: string;
    accessToken: string;
    upsells: string[];
    disclaimerAcknowledged: boolean;
}

export async function POST(req: Request) {
    try {
        const body: CreatePaymentIntentBody = await req.json();
        const { jobId, accessToken, upsells = [], disclaimerAcknowledged } = body;
        console.log("Create payment intent request received", { jobId, upsells, disclaimerAcknowledged });

        // ── 1. Validate disclaimer server-side (§13.2) ──
        if (!disclaimerAcknowledged) {
            return NextResponse.json(
                { error: "You must acknowledge the disclaimer before proceeding." },
                { status: 400 },
            );
        }

        if (!jobId || !accessToken) {
            return NextResponse.json(
                { error: "Missing required fields: jobId, accessToken." },
                { status: 400 },
            );
        }

        // ── 2. Retrieve job & verify token (§7.3) ──
        const job = await prisma.job.findFirst({
            where: { id: jobId, access_token: accessToken },
            include: { category: true },
        });

        if (!job) {
            return NextResponse.json(
                { error: "Invalid job reference or access token." },
                { status: 403 },
            );
        }

        // ── 3. State guard ──
        const allowedStates: JobState[] = [JobState.FREE_SUMMARY_COMPLETE, JobState.AWAITING_PAYMENT];
        if (!allowedStates.includes(job.status)) {
            return NextResponse.json(
                { error: `Cannot create payment intent — job is in '${job.status}' state.` },
                { status: 409 },
            );
        }

        // ── 4. Re-use existing intent if job is already AWAITING_PAYMENT ──
        if (job.status === JobState.AWAITING_PAYMENT && job.stripe_payment_intent_id) {
            try {
                const existing = await stripe.paymentIntents.retrieve(job.stripe_payment_intent_id);
                if (existing.status !== "succeeded" && existing.status !== "canceled") {
                    return NextResponse.json({ clientSecret: existing.client_secret });
                }
            } catch {
                // Intent gone — fall through and create a new one
            }
        }

        // ── 5. Calculate total server-side (never trust client amounts) ──
        const basePrice: number = job.category?.base_price ?? 499;
        let totalAmount = basePrice;
        const purchasedUpsellIds: string[] = [];

        if (upsells.length > 0) {
            const upsellDocs = await prisma.upsell.findMany({
                where: { id: { in: upsells }, is_active: true },
            });

            for (const upsell of upsellDocs) {
                const prices = upsell.category_prices as Record<string, number> | null;
                const price = prices?.[job.category_id] ?? 0;
                if (price > 0) {
                    totalAmount += price;
                    purchasedUpsellIds.push(upsell.id);
                }
            }
        }
        console.log(
            `Calculated total amount: £${(totalAmount / 100).toFixed(2)} for job ${jobId} with upsells:`,
            purchasedUpsellIds,
        );

        // ── 6. Create Stripe PaymentIntent ──
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: "gbp",
            automatic_payment_methods: { enabled: true },
            metadata: {
                jobId,
                accessToken,
                upsells: JSON.stringify(purchasedUpsellIds),
                disclaimerAcknowledged: "true",
            },
            description: `ExplainMyLetter — ${job.category?.name ?? "Letter"} breakdown`,
        });

        // ── 7. Upsert a PENDING JobPayment record ──
        // job_id is not @unique so we use findFirst + create/update
        const existingPayment = await prisma.jobPayment.findFirst({ where: { job_id: jobId } });
        if (existingPayment) {
            await prisma.jobPayment.update({
                where: { id: existingPayment.id },
                data: {
                    stripe_session_id: "",
                    stripe_payment_intent_id: paymentIntent.id,
                    amount: totalAmount,
                    currency: "gbp",
                    status: "pending",
                    upsells_purchased: purchasedUpsellIds,
                },
            });
        } else {
            await prisma.jobPayment.create({
                data: {
                    job_id: jobId,
                    stripe_session_id: "",
                    stripe_payment_intent_id: paymentIntent.id,
                    amount: totalAmount,
                    currency: "gbp",
                    status: "pending",
                    upsells_purchased: purchasedUpsellIds,
                },
            });
        }

        // ── 8. Transition job to AWAITING_PAYMENT ──
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: JobState.AWAITING_PAYMENT,
                previous_state: job.status,
                state_transitioned_at: new Date(),
                disclaimer_acknowledged: true,
                disclaimer_acknowledged_at: new Date(),
                stripe_payment_intent_id: paymentIntent.id,
                upsells_purchased: purchasedUpsellIds,
            },
        });
        console.log(
            `Job ${jobId} updated to AWAITING_PAYMENT with PaymentIntent ${paymentIntent.client_secret}`,
        );

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
        console.error("[create-payment-intent]", error);
        return NextResponse.json(
            { error: error.message || "Failed to create payment intent." },
            { status: 500 },
        );
    }
}