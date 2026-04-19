// src/lib/paymentService.ts

import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";
import { generatePaidBreakdown } from "@/app/api/generate-paid/paidService";

export interface ConfirmArgs {
    jobId: string;
    accessToken: string;
    upsells: string[];
    stripeSessionId: string;
    paymentIntentId: string;
    amountTotal: number;
    currency: string;
}

export async function confirmAndGenerate(args: ConfirmArgs) {
    console.log(`[paymentService] confirmAndGenerate called with args:`, args);
    const { jobId, accessToken, upsells, stripeSessionId, paymentIntentId, amountTotal, currency } = args;

    const job = await prisma.job.findFirst({
        where: { id: jobId, access_token: accessToken },
    });
    if (!job) throw new Error(`Validation: Job ${jobId} not found or token mismatch.`);

    const terminalStates: JobState[] = [
        JobState.PAYMENT_CONFIRMED,
        JobState.PAID_BREAKDOWN_GENERATING,
        JobState.COMPLETED,
    ];
    if (terminalStates.includes(job.status)) {
        console.log(`[payment] Job ${jobId} already at ${job.status} — skipping.`);
        return { skipped: true };
    }

    console.log(`[payment] Job ${jobId} is in state ${job.status} — proceeding.`);
    if (job.status !== JobState.AWAITING_PAYMENT) {
        throw new Error(`Validation: Job ${jobId} is in unexpected state '${job.status}'.`);
    }

    // Atomic claim — only one caller wins.
    // updateMany returns a count; if 0 rows were updated another caller got there first.
    const claimed = await prisma.job.updateMany({
        where: { id: jobId, status: JobState.AWAITING_PAYMENT },
        data: {
            status: JobState.PAYMENT_CONFIRMED,
            previous_state: JobState.AWAITING_PAYMENT,
            state_transitioned_at: new Date(),
            stripe_payment_intent_id: paymentIntentId,
            upsells_purchased: upsells,
        },
    });

    if (claimed.count === 0) {
        console.log(`[payment] Job ${jobId} claimed by concurrent caller — skipping.`);
        return { skipped: true };
    }

    // Upsert JobPayment — job_id is not @unique so we use findFirst + create/update
    const existingPayment = await prisma.jobPayment.findFirst({ where: { job_id: jobId } });
    if (existingPayment) {
        await prisma.jobPayment.update({
            where: { id: existingPayment.id },
            data: {
                stripe_payment_intent_id: paymentIntentId,
                stripe_session_id: stripeSessionId || job.stripe_session_id || "",
                amount: amountTotal,
                currency: currency.toLowerCase(),
                status: "completed",
                upsells_purchased: upsells,
            },
        });
    } else {
        await prisma.jobPayment.create({
            data: {
                job_id: jobId,
                stripe_payment_intent_id: paymentIntentId,
                stripe_session_id: stripeSessionId || job.stripe_session_id || "",
                amount: amountTotal,
                currency: currency.toLowerCase(),
                status: "completed",
                upsells_purchased: upsells,
            },
        });
    }

    // Check Temp for the extracted text
    const tempDoc = await prisma.temp.findUnique({ where: { job_id: jobId } });

    if (!tempDoc?.extracted_text) {
        const failPayment = await prisma.jobPayment.findFirst({ where: { job_id: jobId } });
        await Promise.all([
            prisma.job.update({ where: { id: jobId }, data: { status: JobState.FAILED } }),
            failPayment
                ? prisma.jobPayment.update({ where: { id: failPayment.id }, data: { status: "failed" } })
                : Promise.resolve(),
        ]);
        throw new Error(`Validation: No extracted text in Temp for job ${jobId}. Marked as FAILED.`);
    }

    // Fire-and-forget AI generation
    generatePaidBreakdown(jobId, tempDoc.extracted_text, upsells).catch(async (err: any) => {
        console.error(`[payment] AI generation failed for job ${jobId}:`, err.message);
        const failPayment = await prisma.jobPayment.findFirst({ where: { job_id: jobId } });
        await Promise.all([
            prisma.job.update({ where: { id: jobId }, data: { status: JobState.FAILED } }),
            failPayment
                ? prisma.jobPayment.update({ where: { id: failPayment.id }, data: { status: "failed" } })
                : Promise.resolve(),
        ]);
    });

    return { skipped: false };
}