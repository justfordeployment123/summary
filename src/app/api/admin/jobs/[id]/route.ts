import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobStateLog } from "@/models/JobStateLog";
// Assuming you have a JobToken model based on the schema reqs.
// If not, you can remove the token fetch logic.
import { JobToken } from "@/models/JobToken";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        // Run queries in parallel for speed
        const [job, payment, stateLogs, tokenLogs] = await Promise.all([
            Job.findById(id),
            JobPayment.findOne({ job_id: id }),
            JobStateLog.find({ job_id: id }).sort({ created_at: 1 }),
            JobToken ? JobToken.find({ job_id: id }).sort({ created_at: -1 }) : [],
        ]);

        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Format exactly as the frontend expects
        const jobDetail = {
            jobId: job._id.toString(),
            referenceId: job.reference_id || job._id.toString().slice(-6).toUpperCase(),
            status: job.status,
            category: job.category_id || "Unknown",
            userEmail: job.user_email || "N/A",
            userName: job.user_name || "N/A",
            urgency: job.urgency || "Routine",
            createdAt: job.created_at || new Date().toISOString(),
            updatedAt: job.state_transitioned_at || new Date().toISOString(),
            marketingConsent: job.marketing_consent || false,
            disclaimerAcknowledged: job.disclaimer_acknowledged || false,
            previousState: job.previous_state || "NONE",
            payment: payment
                ? {
                      amount: payment.amount,
                      currency: payment.currency,
                      status: payment.status,
                      stripeSessionId: payment.stripe_session_id,
                      upsellsPurchased: payment.upsells_purchased || [],
                  }
                : undefined,
            stateLog: stateLogs.map((log) => ({
                fromState: log.from_state,
                toState: log.to_state,
                triggeredBy: log.triggered_by,
                createdAt: log.created_at,
            })),
            tokenLog: tokenLogs.map((log) => ({
                promptType: log.prompt_type,
                tokensIn: log.tokens_in,
                tokensOut: log.tokens_out,
                costEstimate: log.cost_estimate,
                model: log.ai_model,
                attemptNumber: log.attempt_number,
                createdAt: log.created_at,
            })),
        };

        return NextResponse.json(jobDetail);
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to retrieve job details" }, { status: 500 });
    }
}
