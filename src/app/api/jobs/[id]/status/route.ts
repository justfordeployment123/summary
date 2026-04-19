// src/app/api/jobs/[id]/status/route.ts
//
// Polling endpoint called by the frontend every 3 seconds after payment.
// Also used on page load to recover state if the user refreshes mid-flow.
//
// What it returns per state:
//   FREE_SUMMARY_COMPLETE     → status + urgency + freeSummary (recovery support)
//   AWAITING_PAYMENT          → status + freeSummary
//   PAYMENT_CONFIRMED         → status (webhook is processing)
//   PAID_BREAKDOWN_GENERATING → status (AI is running)
//   COMPLETED                 → status + urgency + referenceId + detailedBreakdown
//   FAILED                    → status + error message
//   REFUNDED                  → status + error message

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const resolvedParams = await params;
        const jobId = resolvedParams.id;
        const token = req.nextUrl.searchParams.get("token");

        if (!jobId || !token) {
            return NextResponse.json({ error: "Missing job ID or access token." }, { status: 400 });
        }

        // Token + job lookup — UUID access token is the auth mechanism (§7.3)
        const job = await prisma.job.findFirst({
            where: { id: jobId, access_token: token },
        });

        if (!job) {
            return NextResponse.json(
                { error: "Invalid job reference or access token." },
                { status: 403 },
            );
        }

        const base = {
            status: job.status,
            urgency: job.urgency ?? null,
            referenceId: job.reference_id ?? null,
        };

        // ── COMPLETED: return paid breakdown ──────────────────────────────────
        if (job.status === JobState.COMPLETED) {
            if (!job.stripe_payment_intent_id) {
                return NextResponse.json({ error: "Payment not confirmed." }, { status: 403 });
            }

            const tempDoc = await prisma.temp.findUnique({
                where: { job_id: jobId },
            });
            const paidSummary = tempDoc?.extracted_text ?? null;

            if (!paidSummary) {
                // Auto-refund — paid summary missing despite COMPLETED state
                try {
                    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
                        apiVersion: "2026-02-25.clover",
                    });

                    const payment = await prisma.jobPayment.findFirst({
                        where: { job_id: jobId },
                    });

                    if (payment?.stripe_payment_intent_id) {
                        const refund = await stripe.refunds.create({
                            payment_intent: payment.stripe_payment_intent_id,
                        });

                        if (refund.status === "succeeded" || refund.status === "pending") {
                            await Promise.all([
                                prisma.job.update({
                                    where: { id: jobId },
                                    data: {
                                        status: JobState.REFUNDED,
                                        previous_state: job.status,
                                        state_transitioned_at: new Date(),
                                    },
                                }),
                                prisma.jobPayment.update({
                                    where: { id: payment.id },
                                    data: { status: "failed" },
                                }),
                            ]);
                        }
                    }
                } catch (refundError: any) {
                    console.error("[status/auto-refund]", refundError);
                    // Don't block the response — fall through to error below
                }

                return NextResponse.json({
                    status: JobState.REFUNDED,
                    error: "Your breakdown could not be generated. An automatic refund has been issued and should appear within 5–10 business days.",
                });
            }

            // Delete from Temp now that it's been served — TTL is a failsafe only
            await prisma.temp.delete({ where: { job_id: jobId } });

            return NextResponse.json({
                ...base,
                detailedBreakdown: paidSummary,
            });
        }

        // ── FREE_SUMMARY_COMPLETE / AWAITING_PAYMENT: return free summary ─────
        if (
            job.status === JobState.FREE_SUMMARY_COMPLETE ||
            job.status === JobState.AWAITING_PAYMENT
        ) {
            const tempDoc = await prisma.temp.findUnique({ where: { job_id: jobId } });
            return NextResponse.json({
                ...base,
                freeSummary: tempDoc?.extracted_text ?? null,
            });
        }

        // ── FAILED ────────────────────────────────────────────────────────────
        if (job.status === JobState.FAILED) {
            return NextResponse.json({
                ...base,
                error: "We encountered an issue processing your document. Our team has been notified. Please allow up to 24 hours for manual resolution, or contact support to request a refund.",
            });
        }

        // ── REFUNDED ──────────────────────────────────────────────────────────
        if (job.status === JobState.REFUNDED) {
            return NextResponse.json({
                ...base,
                error: "This job has been refunded. Download access has been revoked.",
            });
        }

        // ── All other processing states ───────────────────────────────────────
        // UPLOADED, OCR_PROCESSING, OCR_FAILED, FREE_SUMMARY_GENERATING,
        // PAYMENT_CONFIRMED, PAID_BREAKDOWN_GENERATING
        return NextResponse.json(base);
    } catch (error: any) {
        console.error("[jobs/status]", error);
        return NextResponse.json(
            { error: error.message || "Internal server error." },
            { status: 500 },
        );
    }
}