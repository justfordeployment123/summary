// src/app/api/jobs/[id]/status/route.ts
//
// Polling endpoint called by the frontend every 3 seconds after payment.
// Also used on page load to recover state if the user refreshes mid-flow.
//
// What it returns per state:
//   FREE_SUMMARY_COMPLETE   → status + urgency + free_summary (recovery support)
//   AWAITING_PAYMENT        → status only
//   PAYMENT_CONFIRMED       → status (webhook is processing)
//   PAID_BREAKDOWN_GENERATING → status (AI is running)
//   COMPLETED               → status + urgency + referenceId + detailedBreakdown
//   FAILED                  → status + error message
//   REFUNDED                → status only (download access revoked)

import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();

        const resolvedParams = await params;
        const jobId = resolvedParams.id;
        const token = req.nextUrl.searchParams.get("token");

        if (!jobId || !token) {
            return NextResponse.json({ error: "Missing job ID or access token." }, { status: 400 });
        }

        // Token + job lookup — UUID access token is the auth mechanism (§7.3)
        const job = await Job.findOne({
            _id: jobId,
            access_token: token,
        }).lean<any>();

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        const base = {
            status: job.status,
            urgency: job.urgency ?? null,
            referenceId: job.reference_id ?? null,
        };

        // ── COMPLETED: return paid breakdown ──────────────────────────────────
        // Both payment confirmation AND completed state required (§7.3).
        if (job.status === "COMPLETED") {
            if (!job.stripe_payment_intent_id) {
                return NextResponse.json({ error: "Payment not confirmed." }, { status: 403 });
            }

            return NextResponse.json({
                ...base,
                // paid_summary must be stored on the job to reach the frontend here.
                // This is the only place it is served — the download endpoints
                // serve the formatted file versions (PDF, DOCX, TXT).
                detailedBreakdown: job.paid_summary ?? null,
            });
        }

        // ── FREE_SUMMARY_COMPLETE: return free summary for state recovery ─────
        // Supports the case where the user refreshes the page after the free
        // summary is generated but before payment. The frontend stores this in
        // sessionStorage, but if that's cleared this lets us recover.
        // free_summary is the AI output (§11), NOT the raw extracted text (§21).
        if (job.status === "FREE_SUMMARY_COMPLETE" || job.status === "AWAITING_PAYMENT") {
            return NextResponse.json({
                ...base,
                freeSummary: job.free_summary ?? null,
            });
        }

        // ── FAILED: return user-friendly error ────────────────────────────────
        if (job.status === "FAILED") {
            return NextResponse.json({
                ...base,
                error: "We encountered an issue processing your document. Our team has been notified. Please allow up to 24 hours for manual resolution, or contact support to request a refund.",
            });
        }

        // ── REFUNDED ──────────────────────────────────────────────────────────
        if (job.status === "REFUNDED") {
            return NextResponse.json({
                ...base,
                error: "This job has been refunded. Download access has been revoked.",
            });
        }

        // ── All other states (processing states) ─────────────────────────────
        // UPLOADED, OCR_PROCESSING, OCR_FAILED, FREE_SUMMARY_GENERATING,
        // PAYMENT_CONFIRMED, PAID_BREAKDOWN_GENERATING
        return NextResponse.json(base);
    } catch (error: any) {
        console.error("[jobs/status]", error);
        return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
    }
}
