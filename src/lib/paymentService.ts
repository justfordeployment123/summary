import { Job } from "@/models/Job";
import { JobState } from "@/types/job";
import { JobPayment } from "@/models/JobPayment";
import Temp from "@/models/Temp";
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

    const job = await Job.findOne({ _id: jobId, access_token: accessToken }).lean<any>();
    if (!job) throw new Error(`Validation: Job ${jobId} not found or token mismatch.`);

    const terminalStates = [JobState.PAYMENT_CONFIRMED, JobState.PAID_BREAKDOWN_GENERATING, JobState.COMPLETED];
    if (terminalStates.includes(job.status)) {
        console.log(`[payment] Job ${jobId} already at ${job.status} — skipping.`);
        return { skipped: true };
    }
    console.log(`[payment] Job ${jobId} is in state ${job.status} — proceeding.`);
    if (job.status !== JobState.AWAITING_PAYMENT) {
        throw new Error(`Validation: Job ${jobId} is in unexpected state '${job.status}'.`);
    }

    // Atomic claim — only one caller wins
    const updated = await Job.findOneAndUpdate(
        { _id: jobId, status: JobState.AWAITING_PAYMENT },
        {
            $set: {
                status: JobState.PAYMENT_CONFIRMED,
                previous_state: JobState.AWAITING_PAYMENT,
                state_transitioned_at: new Date(),
                stripe_payment_intent_id: paymentIntentId,
                upsells_purchased: upsells,
            },
        },
        { new: true },
    );

    if (!updated) {
        console.log(`[payment] Job ${jobId} claimed by concurrent caller — skipping.`);
        return { skipped: true };
    }

    await JobPayment.findOneAndUpdate(
        { job_id: jobId },
        {
            $set: {
                stripe_payment_intent_id: paymentIntentId,
                stripe_session_id: stripeSessionId || job.stripe_session_id || "",
                amount: amountTotal,
                currency: currency.toLowerCase(),
                status: "completed",
                upsells_purchased: upsells,
            },
            $setOnInsert: { created_at: new Date() },
        },
        { upsert: true },
    );

    const tempDoc = await Temp.findOne({ job_id: String(jobId) }).lean<any>();
    if (!tempDoc?.extracted_text) {
        await Promise.all([
            Job.findByIdAndUpdate(jobId, { status: JobState.FAILED }),
            JobPayment.findOneAndUpdate({ job_id: jobId }, { $set: { status: "failed" } }),
        ]);
        throw new Error(`Validation: No extracted text in Temp for job ${jobId}. Marked as FAILED.`);
    }

    generatePaidBreakdown(jobId, tempDoc.extracted_text, upsells).catch(async (err: any) => {
        console.error(`[payment] AI generation failed for job ${jobId}:`, err.message);
        await Promise.all([
            Job.findByIdAndUpdate(jobId, { status: JobState.FAILED }),
            JobPayment.findOneAndUpdate({ job_id: jobId }, { $set: { status: "failed" } }),
        ]);
    });
    return { skipped: false };
}
