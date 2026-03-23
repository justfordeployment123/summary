// src/app/api/admin/jobs/[id]/regenerate/route.ts
//
// Requirements:
//   • Only available for FAILED jobs with confirmed payment (§8.3)
//   • Re-uses stored job parameters: category, extracted text, upsells
//   • Max regeneration attempts configurable via Settings (default: 3)
//   • Every attempt logged to regeneration_log with timestamp + admin ID
//   • Cannot generate paid content for unpaid jobs

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { Setting } from "@/models/Setting";
import { RegenerationLog } from "@/models/RegenerationLog";
import Temp from "@/models/Temp";
import { generatePaidBreakdown } from "@/app/api/generate-paid/paidService";

const DEFAULT_MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        // ── 1. Identify the admin triggering the action ──
        // Read from session cookie set by your admin auth middleware.
        // Falls back to "unknown_admin" if the session can't be parsed —
        // still logs the attempt so there's always an audit trail.
        const adminId = req.cookies.get("admin_session")?.value ?? "unknown_admin";

        // ── 2. Load job ──
        const job = await Job.findById(id).lean<any>();
        if (!job) {
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }

        // ── 3. Must be FAILED ──
        if (job.status !== "FAILED") {
            return NextResponse.json({ error: `Regenerate is only available for FAILED jobs. Current status: ${job.status}` }, { status: 409 });
        }

        // ── 4. Must have confirmed payment ──
        const payment = await JobPayment.findOne({ job_id: id, status: "completed" }).lean<any>();
        if (!payment && !job.stripe_payment_intent_id) {
            return NextResponse.json({ error: "Cannot regenerate — no confirmed payment on record for this job." }, { status: 403 });
        }

        // ── 5. Check max regeneration attempts ──
        const maxAttemptSetting = await Setting.findOne({ key: "max_regeneration_attempts" }).lean<{ value: number }>();
        const maxAttempts = maxAttemptSetting?.value ?? DEFAULT_MAX_ATTEMPTS;

        const previousAttempts = await RegenerationLog.countDocuments({ job_id: id });

        if (previousAttempts >= maxAttempts) {
            return NextResponse.json(
                {
                    error: `Maximum regeneration attempts reached (${maxAttempts}). Adjust the limit in Settings or contact support.`,
                },
                { status: 429 },
            );
        }

        const attemptNumber = previousAttempts + 1;

        // ── 6. Log the attempt BEFORE triggering (so it's always recorded) ──
        const logEntry = await RegenerationLog.create({
            job_id: id,
            triggered_by_admin_id: adminId,
            attempt_number: attemptNumber,
            status: "triggered",
            created_at: new Date(),
        });

        // ── 7. Recover extracted text from Temp collection ──
        // The Temp document may have been deleted after the original paid generation
        // attempt. If it's gone, the admin cannot regenerate without the user
        // re-uploading the document.
        const tempDoc = await Temp.findOne({ job_id: String(id) }).lean<any>();
        if (!tempDoc?.extracted_text) {
            await RegenerationLog.findByIdAndUpdate(logEntry._id, { status: "failed" });
            return NextResponse.json(
                {
                    error: "Extracted document text is no longer available (Temp record expired). The user will need to re-upload the document to generate a new breakdown.",
                },
                { status: 410 },
            );
        }

        // ── 8. Reset job to PAYMENT_CONFIRMED so generatePaidBreakdown accepts it ──
        await Job.findByIdAndUpdate(id, {
            status: "PAYMENT_CONFIRMED",
            previous_state: "FAILED",
            state_transitioned_at: new Date(),
        });

        // ── 9. Re-trigger paid AI generation with original parameters ──
        const upsells: string[] = payment?.upsells_purchased ?? job.upsells_purchased ?? [];

        try {
            await generatePaidBreakdown(id, tempDoc.extracted_text, upsells);

            // Log success
            await RegenerationLog.findByIdAndUpdate(logEntry._id, { status: "completed" });

            return NextResponse.json({
                success: true,
                attemptNumber,
                attemptsLeft: maxAttempts - attemptNumber,
            });
        } catch (genError: any) {
            // generatePaidBreakdown sets job status to FAILED on error — log it
            await RegenerationLog.findByIdAndUpdate(logEntry._id, { status: "failed" });

            return NextResponse.json({ error: `Regeneration failed: ${genError.message}` }, { status: 502 });
        }
    } catch (error: any) {
        console.error("[regenerate]", error);
        return NextResponse.json({ error: error.message || "Failed to trigger regeneration." }, { status: 500 });
    }
}

// ── GET — fetch regeneration history for a job ────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const maxAttemptSetting = await Setting.findOne({ key: "max_regeneration_attempts" }).lean<{ value: number }>();
        const maxAttempts = maxAttemptSetting?.value ?? DEFAULT_MAX_ATTEMPTS;

        const logs = await RegenerationLog.find({ job_id: id }).sort({ created_at: -1 }).lean<any[]>();

        return NextResponse.json({
            logs: logs.map((l) => ({
                id: l._id.toString(),
                attemptNumber: l.attempt_number,
                triggeredBy: l.triggered_by_admin_id,
                status: l.status,
                createdAt: l.created_at,
            })),
            totalAttempts: logs.length,
            maxAttempts,
            attemptsLeft: Math.max(0, maxAttempts - logs.length),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
