// src/app/api/admin/cleanup/route.ts
//
// Admin-triggered job metadata cleanup (§21).
// Uses the same pattern as all other admin routes — no special auth needed,
// protected by the existing admin middleware on the /api/admin/* path.
//
// GET  — preview how many records would be deleted
// POST — run the cleanup

import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobToken } from "@/models/JobToken";
import { Setting } from "@/models/Setting";
import WebhookEvent from "@/models/WebhookEvent";

const DEFAULT_RETENTION_DAYS = 365;

async function getRetentionDays(): Promise<number> {
    try {
        const setting = await Setting.findOne({ key: "job_metadata_retention_days" }).lean<{ value: number }>();
        return typeof setting?.value === "number" && setting.value > 0
            ? setting.value
            : DEFAULT_RETENTION_DAYS;
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
        await connectToDatabase();

        const retentionDays = await getRetentionDays();
        const cutoff = getCutoffDate(retentionDays);

        const expiredJobCount = await Job.countDocuments({ created_at: { $lt: cutoff } });

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
        await connectToDatabase();

        const retentionDays = await getRetentionDays();
        const cutoff = getCutoffDate(retentionDays);

        // Find expired job IDs first for cascading deletes
        const expiredJobs = await Job.find(
            { created_at: { $lt: cutoff } },
            { _id: 1 },
        ).lean<{ _id: any }[]>();

        const expiredJobIds = expiredJobs.map((j) => j._id);

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

        // Delete jobs + all associated records in parallel
        const [jobsDeleted, paymentsDeleted, tokenLogsDeleted, webhookLogsDeleted] =
            await Promise.all([
                Job.deleteMany({ _id: { $in: expiredJobIds } }).then((r) => r.deletedCount),
                JobPayment.deleteMany({ job_id: { $in: expiredJobIds } }).then((r) => r.deletedCount),
                JobToken.deleteMany({ job_id: { $in: expiredJobIds } }).then((r) => r.deletedCount),
                WebhookEvent.deleteMany({ job_id: { $in: expiredJobIds } }).then((r) => r.deletedCount),
            ]);

        const result = {
            ranAt: new Date().toISOString(),
            retentionDays,
            cutoffDate: cutoff.toISOString(),
            jobsDeleted,
            paymentsDeleted,
            tokenLogsDeleted,
            webhookLogsDeleted,
        };

        console.log("[cleanup] Complete:", result);
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error("[cleanup POST]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}