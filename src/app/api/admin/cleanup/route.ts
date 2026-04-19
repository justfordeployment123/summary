// src/app/api/admin/cleanup/route.ts
//
// Admin-triggered job metadata cleanup (§21).
// Uses the same pattern as all other admin routes — no special auth needed,
// protected by the existing admin middleware on the /api/admin/* path.
//
// GET  — preview how many records would be deleted
// POST — run the cleanup

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_RETENTION_DAYS = 365;

async function getRetentionDays(): Promise<number> {
    try {
        const setting = await prisma.setting.findUnique({ 
            where: { key: "job_metadata_retention_days" } 
        });
        
        const val = setting?.value as number;
        return typeof val === "number" && val > 0 ? val : DEFAULT_RETENTION_DAYS;
    } catch {
        return DEFAULT_RETENTION_DAYS;
    }
}

function getCutoffDate(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
}

// ─── GET — preview ────────────────────────────────────────────────────────────

export async function GET() {
    try {
        const retentionDays = await getRetentionDays();
        const cutoff = getCutoffDate(retentionDays);

        const expiredJobCount = await prisma.job.count({ 
            where: { created_at: { lt: cutoff } } 
        });

        return NextResponse.json({
            retentionDays,
            cutoffDate: cutoff.toISOString(),
            expiredJobs: expiredJobCount,
        });
    } catch (error: any) {
        console.error("[cleanup GET]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── POST — run cleanup ───────────────────────────────────────────────────────

export async function POST() {
    try {
        const retentionDays = await getRetentionDays();
        const cutoff = getCutoffDate(retentionDays);

        // Find expired job IDs first so we can target their relations
        const expiredJobs = await prisma.job.findMany({
            where: { created_at: { lt: cutoff } },
            select: { id: true },
        });

        const expiredJobIds = expiredJobs.map((j) => j.id);

        if (expiredJobIds.length === 0) {
            return NextResponse.json({
                success: true,
                result: {
                    ranAt: new Date().toISOString(),
                    retentionDays,
                    cutoffDate: cutoff.toISOString(),
                    jobsDeleted: 0,
                    paymentsDeleted: 0,
                    tokenLogsDeleted: 0,
                    webhookLogsDeleted: 0,
                },
            });
        }

        // Delete relations explicitly via Transaction to get the exact counts for the frontend.
        // Order matters: delete child relations first, then the parent Job.
        const [payments, tokens, webhooks, jobs] = await prisma.$transaction([
            prisma.jobPayment.deleteMany({ where: { job_id: { in: expiredJobIds } } }),
            prisma.jobToken.deleteMany({ where: { job_id: { in: expiredJobIds } } }),
            prisma.webhookEvent.deleteMany({ where: { job_id: { in: expiredJobIds } } }),
            prisma.job.deleteMany({ where: { id: { in: expiredJobIds } } })
        ]);

        const result = {
            ranAt: new Date().toISOString(),
            retentionDays,
            cutoffDate: cutoff.toISOString(),
            jobsDeleted: jobs.count,
            paymentsDeleted: payments.count,
            tokenLogsDeleted: tokens.count,
            webhookLogsDeleted: webhooks.count,
        };

        console.log("[cleanup] Complete:", result);
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error("[cleanup POST]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}