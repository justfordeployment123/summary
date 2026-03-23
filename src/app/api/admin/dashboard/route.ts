import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
// IMPORTANT: We must import the Category model so Mongoose knows about it before running .populate()
import { Category } from "@/models/Category";
import { JobState } from "@/types/job";

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

        // 3. Revenue Calculations (Stored in pennies, keep in pennies for frontend)
        const paymentsToday = await JobPayment.aggregate([
            { $match: { status: "completed", created_at: { $gte: startOfToday } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const revenueToday = paymentsToday.length > 0 ? paymentsToday[0].total : 0;

        const paymentsMonth = await JobPayment.aggregate([
            { $match: { status: "completed", created_at: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const revenueMonth = paymentsMonth.length > 0 ? paymentsMonth[0].total : 0;

        // 4. Token Usage (Mock data for now until the Settings/Logs models are fully wired up)
        const tokenUsageMonth = 45000;
        const tokenCapMonth = 100000;
        const capWarning = tokenUsageMonth / tokenCapMonth >= 0.8;

        // 5. Stuck Jobs (Processing for more than 10 minutes)
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
            // Safe fallback just in case updated_at is missing on old data
            stuckFor: job.updated_at ? Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 60000) : 0,
            email: job.user_email || "Anonymous",
        }));

        // 6. Recent Jobs (Last 10)
        Category.init();
        // Add .populate() to automatically fetch the linked Category data
        const recentJobsRaw = await Job.find()
            .sort({ created_at: -1 })
            .limit(10)
            .populate("category_id", "name") // Fetches the category name from the Category table
            .lean();

        const recentJobs = await Promise.all(
            recentJobsRaw.map(async (job: any) => {
                // Find associated payment amount if the job is paid
                let amount = undefined;
                if (job.status === JobState.COMPLETED) {
                    const payment = await JobPayment.findOne({ job_id: job._id, status: "completed" }).lean();
                    if (payment) amount = payment.amount;
                }

                // ULTRA-SAFE DATE PARSER: Checks for both created_at and createdAt to prevent crashes
                const rawDate = job.created_at || job.createdAt;
                const safeDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

                return {
                    jobId: job._id.toString(),
                    referenceId: job._id.toString().slice(-6).toUpperCase(),
                    status: job.status,
                    // Use the populated category data
                    category: job.category_id?.name || "Unknown",
                    email: job.user_email || "Anonymous",
                    // Fix to match your schema
                    urgency: job.urgency || "—",
                    createdAt: safeDate,
                    amount,
                };
            }),
        );

        // 7. Return the Exact Structure Expected by `DashboardStats` Interface
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
