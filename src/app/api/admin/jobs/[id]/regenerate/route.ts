// src/app/api/admin/jobs/[id]/regenerate/route.ts
//
// Requirements:
//   • Only available for FAILED jobs with confirmed payment (§8.3)
//   • Re-uses stored job parameters: category, extracted text, upsells
//   • Max regeneration attempts configurable via Settings (default: 3)
//   • Every attempt logged to regeneration_log with timestamp + admin ID
//   • Cannot generate paid content for unpaid jobs

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { JobState, PaymentStatus, RegenerationStatus } from "@prisma/client";
import { generatePaidBreakdown } from "@/app/api/generate-paid/paidService";

const DEFAULT_MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // ── 1. Identify the admin triggering the action ──
        const adminId = req.cookies.get("admin_session")?.value ?? "unknown_admin";

        // ── 2. Load job ──
        const job = await prisma.job.findUnique({ 
            where: { id } 
        });
        
        if (!job) {
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }

        // ── 3. Must be FAILED ──
        if (job.status !== JobState.FAILED) {
            return NextResponse.json({ error: `Regenerate is only available for FAILED jobs. Current status: ${job.status}` }, { status: 409 });
        }

        // ── 4. Must have confirmed payment ──
        const payment = await prisma.jobPayment.findFirst({ 
            where: { 
                job_id: id, 
                status: PaymentStatus.completed 
            } 
        });
        
        if (!payment && !job.stripe_payment_intent_id) {
            return NextResponse.json({ error: "Cannot regenerate — no confirmed payment on record for this job." }, { status: 403 });
        }

        // ── 5. Check max regeneration attempts ──
        // Fetch setting and previous attempts concurrently
        const [maxAttemptSetting, previousAttempts] = await Promise.all([
            prisma.setting.findUnique({ where: { key: "max_regeneration_attempts" } }),
            prisma.regenerationLog.count({ where: { job_id: id } })
        ]);

        const maxAttempts = (maxAttemptSetting?.value as number) ?? DEFAULT_MAX_ATTEMPTS;

        if (previousAttempts >= maxAttempts) {
            return NextResponse.json(
                { error: `Maximum regeneration attempts reached (${maxAttempts}). Adjust the limit in Settings or contact support.` },
                { status: 429 },
            );
        }

        const attemptNumber = previousAttempts + 1;

        // ── 6. Log the attempt BEFORE triggering (so it's always recorded) ──
        const logEntry = await prisma.regenerationLog.create({
            data: {
                job_id: id,
                triggered_by_admin_id: adminId,
                attempt_number: attemptNumber,
                status: RegenerationStatus.triggered,
            }
        });

        // ── 7. Recover extracted text from Temp collection ──
        const tempDoc = await prisma.temp.findUnique({ 
            where: { job_id: id } 
        });
        
        if (!tempDoc?.extracted_text) {
            await prisma.regenerationLog.update({
                where: { id: logEntry.id },
                data: { status: RegenerationStatus.failed }
            });
            return NextResponse.json(
                { error: "Extracted document text is no longer available (Temp record expired). The user will need to re-upload the document to generate a new breakdown." },
                { status: 410 },
            );
        }

        // ── 8. Reset job to PAYMENT_CONFIRMED so generatePaidBreakdown accepts it ──
        await prisma.job.update({
            where: { id },
            data: {
                status: JobState.PAYMENT_CONFIRMED,
                previous_state: JobState.FAILED,
                state_transitioned_at: new Date(),
            }
        });

        // ── 9. Re-trigger paid AI generation with original parameters ──
        // Prisma uses native string arrays, so we can pass it directly
        const upsells: string[] = payment?.upsells_purchased?.length ? payment.upsells_purchased : job.upsells_purchased;

        try {
            await generatePaidBreakdown(id, tempDoc.extracted_text, upsells);

            // Log success
            await prisma.regenerationLog.update({
                where: { id: logEntry.id },
                data: { status: RegenerationStatus.completed }
            });

            return NextResponse.json({
                success: true,
                attemptNumber,
                attemptsLeft: maxAttempts - attemptNumber,
            });
        } catch (genError: any) {
            // generatePaidBreakdown sets job status to FAILED on error — log it
            await prisma.regenerationLog.update({
                where: { id: logEntry.id },
                data: { status: RegenerationStatus.failed }
            });

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
        const { id } = await params;

        // Fetch logs and settings in parallel
        const [maxAttemptSetting, logs] = await Promise.all([
            prisma.setting.findUnique({ where: { key: "max_regeneration_attempts" } }),
            prisma.regenerationLog.findMany({
                where: { job_id: id },
                orderBy: { created_at: 'desc' }
            })
        ]);

        const maxAttempts = (maxAttemptSetting?.value as number) ?? DEFAULT_MAX_ATTEMPTS;

        return NextResponse.json({
            logs: logs.map((l) => ({
                id: l.id,
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