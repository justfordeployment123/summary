import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobState } from "@/types/job";
// Note: You will eventually want to wrap this in a middleware or auth check!

export async function GET(request: Request) {
    try {
        await dbConnect();

        // 1. Revenue & Payment Metrics
        const completedPayments = await JobPayment.find({ status: "completed" });
        const totalRevenuePennies = completedPayments.reduce((acc, curr) => acc + curr.amount, 0);
        const totalRevenue = (totalRevenuePennies / 100).toFixed(2); // Convert to GBP

        // 2. Job Funnel Metrics
        const totalJobs = await Job.countDocuments();
        const paidJobs = await Job.countDocuments({ status: JobState.COMPLETED });
        const failedJobs = await Job.countDocuments({ status: { $in: [JobState.OCR_FAILED, JobState.FAILED] } });

        const conversionRate = totalJobs > 0 ? ((paidJobs / totalJobs) * 100).toFixed(1) : 0;

        // 3. Recent Activity (Last 10 Jobs)
        const recentJobs = await Job.find().sort({ created_at: -1 }).limit(10).select("user_email status category_name created_at").lean();

        return NextResponse.json(
            {
                metrics: {
                    totalRevenue: `£${totalRevenue}`,
                    totalJobs,
                    paidJobs,
                    failedJobs,
                    conversionRate: `${conversionRate}%`,
                },
                recentJobs,
            },
            { status: 200 },
        );
    } catch (error: any) {
        console.error("Admin Dashboard Error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
    }
}
