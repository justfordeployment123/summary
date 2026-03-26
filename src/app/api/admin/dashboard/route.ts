import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobToken } from "@/models/JobToken";
import { Setting } from "@/models/Setting";
// IMPORTANT: We must import the Category model so Mongoose knows about it before running .populate()
import { Category } from "@/models/Category";
import { JobState } from "@/types/job";

const DEFAULT_MONTHLY_CAP = 10_000_000;
const CAP_WARNING_THRESHOLD = 0.8;

export async function GET(request: Request) {
    try {
        await dbConnect();

        // 1. Date boundaries for Today and This Month
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 2. Job Statistics
        const totalJobs = await Job.countDocuments();

        const completedToday = await Job.countDocuments({
            status: JobState.COMPLETED,
            updated_at: { $gte: startOfToday },
        });

        const pendingJobs = await Job.countDocuments({
            status: {
                $in: [
                    JobState.UPLOADED,
                    JobState.OCR_PROCESSING,
                    JobState.FREE_SUMMARY_GENERATING,
                    JobState.AWAITING_PAYMENT,
                    JobState.PAID_BREAKDOWN_GENERATING,
                ],
            },
        });

        const failedJobs = await Job.countDocuments({
            status: { $in: [JobState.OCR_FAILED, JobState.FAILED] },
        });

        // 3. Revenue Calculations (stored in pennies, keep in pennies for frontend)
        const paymentsToday = await JobPayment.aggregate([
            { $match: { status: "completed", created_at: { $gte: startOfToday } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const revenueToday = paymentsToday[0]?.total ?? 0;

        const paymentsMonth = await JobPayment.aggregate([
            { $match: { status: "completed", created_at: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const revenueMonth = paymentsMonth[0]?.total ?? 0;

        // 4. Token Usage — aggregated live from JobToken collection
        //    Sums tokens_in + tokens_out for every record created this calendar month.
        //    This is the authoritative source — replaces the old hardcoded mock values.
        const [tokenUsageAgg, tokenCapSetting] = await Promise.all([
            JobToken.aggregate([
                { $match: { created_at: { $gte: startOfMonth } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $add: ["$tokens_in", "$tokens_out"] } },
                    },
                },
            ]),
            // Key must match exactly what the settings page saves: "openai_monthly_token_cap"
            Setting.findOne({ key: "openai_monthly_token_cap" }).lean<any>(),
        ]);

        const tokenUsageMonth: number = tokenUsageAgg[0]?.total ?? 0;
        // Coerce to Number — the Setting value may be stored/returned as a string.
        // Only fall back to DEFAULT_MONTHLY_CAP when the key is genuinely absent.
        const rawCap = tokenCapSetting?.value;
        const tokenCapMonth: number = rawCap !== undefined && rawCap !== null && !isNaN(Number(rawCap)) ? Number(rawCap) : DEFAULT_MONTHLY_CAP;
        const capWarning = tokenUsageMonth / tokenCapMonth >= CAP_WARNING_THRESHOLD;

        // Keep the Settings usage key in sync so tokenBudget.ts cap-checks stay accurate
        // (fire-and-forget — does not block the response)
        const monthKey = `openai_token_usage_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        Setting.findOneAndUpdate(
            { key: monthKey },
            { value: tokenUsageMonth, description: `Monthly token usage for ${monthKey} (synced from JobToken)` },
            { upsert: true },
        ).catch((err: unknown) => console.error("[dashboard] Failed to sync token usage to Settings:", err));

        // 5. Stuck Jobs (processing for more than 10 minutes)
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const stuckJobsRaw = await Job.find({
            status: { $in: [JobState.OCR_PROCESSING, JobState.FREE_SUMMARY_GENERATING, JobState.PAID_BREAKDOWN_GENERATING] },
            updated_at: { $lt: tenMinsAgo },
        })
            .limit(10)
            .lean();

        const stuckJobs = stuckJobsRaw.map((job: any) => ({
            jobId: job._id.toString(),
            referenceId: job._id.toString().slice(-6).toUpperCase(),
            status: job.status,
            stuckFor: job.updated_at ? Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 60000) : 0,
            email: job.user_email || "Anonymous",
        }));

        // 6. Recent Jobs (last 10)
        Category.init();
        const recentJobsRaw = await Job.find().sort({ created_at: -1 }).limit(10).populate("category_id", "name").lean();

        const recentJobs = await Promise.all(
            recentJobsRaw.map(async (job: any) => {
                let amount = undefined;
                if (job.status === JobState.COMPLETED) {
                    const payment = await JobPayment.findOne({ job_id: job._id, status: "completed" }).lean();
                    if (payment) amount = payment.amount;
                }

                const rawDate = job.created_at || job.createdAt;
                const safeDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

                return {
                    jobId: job._id.toString(),
                    referenceId: job._id.toString().slice(-6).toUpperCase(),
                    status: job.status,
                    category: job.category_id?.name || "Unknown",
                    email: job.user_email || "Anonymous",
                    urgency: job.urgency || "—",
                    createdAt: safeDate,
                    amount,
                };
            }),
        );

        // 7. Return the exact structure expected by the `DashboardStats` interface
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
