// src/app/api/admin/jobs/[id]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Fetch the Job (with all its relations natively joined) AND the setting in parallel
        const [job, maxAttemptSetting] = await Promise.all([
            prisma.job.findUnique({
                where: { id },
                include: {
                    // Automatically pull the category name
                    category: { select: { name: true } },

                    // Pull the most recent payment
                    payments: { orderBy: { created_at: "desc" }, take: 1 },

                    // Pull and sort all logs natively
                    stateLogs: { orderBy: { createdAt: "asc" } },
                    tokens: { orderBy: { created_at: "desc" } },
                    regenerationLogs: { orderBy: { created_at: "desc" } },
                },
            }),
            prisma.setting.findUnique({
                where: { key: "max_regeneration_attempts" },
            }),
        ]);

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // The latest payment attempt (if one exists)
        const payment = job.payments[0];

        // Resolve upsell names
        let upsellNames: string[] = [];
        const upsellIds = payment?.upsells_purchased?.length ? payment.upsells_purchased : job.upsells_purchased;

        if (upsellIds && upsellIds.length > 0) {
            try {
                const upsellDocs = await prisma.upsell.findMany({
                    where: { id: { in: upsellIds } },
                    select: { name: true },
                });
                upsellNames = upsellDocs.map((u) => u.name);
            } catch (err) {
                // Fall back to raw IDs if the query fails
                upsellNames = upsellIds;
            }
        }

        // Safely parse the max attempts setting from the JSON field
        const maxAttempts = (maxAttemptSetting?.value as number) ?? 3;

        // Map perfectly to your existing frontend expectations
        const jobDetail = {
            jobId: job.id,
            referenceId: job.reference_id || job.id.slice(-6).toUpperCase(),
            status: job.status,
            category: job.category?.name ?? "Unknown",
            userEmail: job.user_email ?? "N/A",
            userName: job.user_name ?? "N/A",
            urgency: job.urgency ?? "Routine",
            createdAt: job.created_at.toISOString(),
            updatedAt: job.state_transitioned_at?.toISOString() ?? job.updated_at.toISOString(),
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

            stateLog: job.stateLogs.map((log) => ({
                fromState: log.from_state,
                toState: log.to_state,
                triggeredBy: log.triggered_by ?? "system",
                createdAt: log.createdAt.toISOString(),
            })),

            tokenLog: job.tokens.map((log) => ({
                promptType: log.prompt_type,
                tokensIn: log.tokens_in,
                tokensOut: log.tokens_out,
                costEstimate: log.cost_estimate,
                model: log.ai_model,
                attemptNumber: log.attempt_number,
                createdAt: log.created_at.toISOString(),
            })),

            regenerationLog: job.regenerationLogs.map((log) => ({
                id: log.id,
                attemptNumber: log.attempt_number,
                triggeredBy: log.triggered_by_admin_id,
                status: log.status,
                createdAt: log.created_at.toISOString(),
            })),

            regenerationAttemptsUsed: job.regenerationLogs.length,
            regenerationMaxAttempts: maxAttempts,
            canRegenerate: job.status === "FAILED" && job.regenerationLogs.length < maxAttempts,
        };

        return NextResponse.json(jobDetail);
    } catch (error: any) {
        console.error("[admin/jobs/[id] GET]", error);
        return NextResponse.json({ error: "Failed to retrieve job details" }, { status: 500 });
    }
}
