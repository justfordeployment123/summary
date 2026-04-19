// src/app/api/admin/dashboard/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";

const DEFAULT_MONTHLY_CAP = 10_000_000;
const CAP_WARNING_THRESHOLD = 0.8;

export async function GET() {
    try {
        // 1. Date boundaries for Today and This Month
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 2. Job Statistics
        const [totalJobs, completedToday, pendingJobs, failedJobs] = await Promise.all([
            prisma.job.count(),
            prisma.job.count({
                where: {
                    status: JobState.COMPLETED,
                    updated_at: { gte: startOfToday },
                },
            }),
            prisma.job.count({
                where: {
                    status: {
                        in: [
                            JobState.UPLOADED,
                            JobState.OCR_PROCESSING,
                            JobState.FREE_SUMMARY_GENERATING,
                            JobState.AWAITING_PAYMENT,
                            JobState.PAID_BREAKDOWN_GENERATING,
                        ],
                    },
                },
            }),
            prisma.job.count({
                where: {
                    status: { in: [JobState.OCR_FAILED, JobState.FAILED] },
                },
            }),
        ]);

        // 3. Revenue Calculations (stored in pennies)
        const [paymentsTodayAgg, paymentsMonthAgg] = await Promise.all([
            prisma.jobPayment.aggregate({
                where: { status: "completed", created_at: { gte: startOfToday } },
                _sum: { amount: true },
            }),
            prisma.jobPayment.aggregate({
                where: { status: "completed", created_at: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
        ]);
        const revenueToday = paymentsTodayAgg._sum.amount ?? 0;
        const revenueMonth = paymentsMonthAgg._sum.amount ?? 0;

        // 4. Token Usage — aggregated from JobToken
        const [tokenUsageAgg, tokenCapSetting] = await Promise.all([
            prisma.jobToken.aggregate({
                where: { created_at: { gte: startOfMonth } },
                _sum: { tokens_in: true, tokens_out: true },
            }),
            prisma.setting.findUnique({ where: { key: "openai_monthly_token_cap" } }),
        ]);

        const tokenUsageMonth =
            (tokenUsageAgg._sum.tokens_in ?? 0) + (tokenUsageAgg._sum.tokens_out ?? 0);

        const rawCap = tokenCapSetting?.value;
        const tokenCapMonth: number =
            rawCap !== undefined && rawCap !== null && !isNaN(Number(rawCap))
                ? Number(rawCap)
                : DEFAULT_MONTHLY_CAP;
        const capWarning = tokenUsageMonth / tokenCapMonth >= CAP_WARNING_THRESHOLD;

        // Keep the Settings usage key in sync so tokenBudget cap-checks stay accurate
        // (fire-and-forget — does not block the response)
        const monthKey = `openai_token_usage_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        prisma.setting
            .upsert({
                where: { key: monthKey },
                update: { value: tokenUsageMonth },
                create: {
                    key: monthKey,
                    value: tokenUsageMonth,
                    description: `Monthly token usage for ${monthKey} (synced from JobToken)`,
                },
            })
            .catch((err: unknown) =>
                console.error("[dashboard] Failed to sync token usage to Settings:", err),
            );

        // 5. Stuck Jobs (processing for more than 10 minutes)
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const stuckJobsRaw = await prisma.job.findMany({
            where: {
                status: {
                    in: [
                        JobState.OCR_PROCESSING,
                        JobState.FREE_SUMMARY_GENERATING,
                        JobState.PAID_BREAKDOWN_GENERATING,
                    ],
                },
                updated_at: { lt: tenMinsAgo },
            },
            take: 10,
        });

        const stuckJobs = stuckJobsRaw.map((job) => ({
            jobId: job.id,
            referenceId: job.reference_id,
            status: job.status,
            stuckFor: job.updated_at
                ? Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 60000)
                : 0,
            email: job.user_email,
        }));

        // 6. Recent Jobs (last 10) with category name and payment amount
        const recentJobsRaw = await prisma.job.findMany({
            orderBy: { created_at: "desc" },
            take: 10,
            include: {
                category: { select: { name: true } },
                payments: {
                    where: { status: "completed" },
                    select: { amount: true },
                    take: 1,
                },
            },
        });

        const recentJobs = recentJobsRaw.map((job) => ({
            jobId: job.id,
            referenceId: job.reference_id,
            status: job.status,
            category: job.category?.name ?? "Unknown",
            email: job.user_email,
            urgency: job.urgency ?? "—",
            createdAt: job.created_at.toISOString(),
            amount: job.status === JobState.COMPLETED ? (job.payments[0]?.amount ?? undefined) : undefined,
        }));

        // 7. Return dashboard stats
        return NextResponse.json(
            {
                totalJobs,
                completedToday,
                pendingJobs,
                failedJobs,
                revenueToday,
                revenueMonth,
                tokenUsageMonth,
                tokenCapMonth,
                capWarning,
                stuckJobs,
                recentJobs,
            },
            { status: 200 },
        );
    } catch (error: any) {
        console.error("Admin Dashboard Error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
    }
}