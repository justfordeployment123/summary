// src/app/api/admin/jobs/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobStateLog } from "@/models/JobStateLog";
import { JobToken } from "@/models/JobToken";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const [job, payment, stateLogs, tokenLogs] = await Promise.all([
            // Populate category name + upsell names in one shot
            Job.findById(id).populate("category_id", "name").lean<any>(),
            JobPayment.findOne({ job_id: id }).lean<any>(),
            JobStateLog.find({ job_id: id }).sort({ created_at: 1 }).lean<any[]>(),
            JobToken.find({ job_id: id }).sort({ created_at: -1 }).lean<any[]>(),
        ]);

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Resolve upsell names if IDs are stored on the payment or job
        let upsellNames: string[] = [];
        const upsellIds: string[] = payment?.upsells_purchased ?? job.upsells_purchased ?? [];

        if (upsellIds.length > 0) {
            try {
                // Dynamic import so this doesn't break if Upsell model isn't registered yet
                const { default: Upsell } = await import("@/models/Upsell");
                const upsellDocs = await Upsell.find({
                    _id: { $in: upsellIds },
                })
                    .select("name")
                    .lean<{ name: string }[]>();
                upsellNames = upsellDocs.map((u) => u.name);
            } catch {
                // Fall back to raw IDs if model unavailable
                upsellNames = upsellIds;
            }
        }

        const jobDetail = {
            jobId: job._id.toString(),
            referenceId: job.reference_id || job._id.toString().slice(-6).toUpperCase(),
            status: job.status,
            category: (job.category_id as any)?.name ?? "Unknown",
            userEmail: job.user_email ?? "N/A",
            userName: job.user_name ?? "N/A",
            urgency: job.urgency ?? "Routine",
            createdAt: job.created_at ?? new Date().toISOString(),
            updatedAt: job.state_transitioned_at ?? new Date().toISOString(),
            marketingConsent: job.marketing_consent ?? false,
            disclaimerAcknowledged: job.disclaimer_acknowledged ?? false,
            previousState: job.previous_state ?? "NONE",
            stripePaymentIntentId: job.stripe_payment_intent_id ?? null,

            payment: payment
                ? {
                      amount: payment.amount,
                      currency: payment.currency,
                      status: payment.status,
                      stripeSessionId: payment.stripe_session_id ?? "",
                      stripeIntentId: payment.stripe_payment_intent_id ?? "",
                      upsellsPurchased: upsellNames,
                  }
                : undefined,

            stateLog: stateLogs.map((log) => ({
                fromState: log.from_state,
                toState: log.to_state,
                triggeredBy: log.triggered_by ?? "system",
                createdAt: log.created_at,
            })),

            tokenLog: tokenLogs.map((log) => ({
                promptType: log.prompt_type,
                tokensIn: log.tokens_in,
                tokensOut: log.tokens_out,
                costEstimate: log.cost_estimate,
                model: log.model ?? log.ai_model,
                attemptNumber: log.attempt_number,
                createdAt: log.created_at,
            })),
        };

        return NextResponse.json(jobDetail);
    } catch (error: any) {
        console.error("[admin/jobs/[id] GET]", error);
        return NextResponse.json({ error: "Failed to retrieve job details" }, { status: 500 });
    }
}
