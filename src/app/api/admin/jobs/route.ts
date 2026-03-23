// src/app/api/admin/jobs/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { Category } from "@/models/Category";

export async function GET(request: Request) {
    try {
        await dbConnect();

        const url = new URL(request.url);
        const filter: Record<string, any> = {};

        const status = url.searchParams.get("status");
        if (status && status !== "All") filter.status = status;

        const email = url.searchParams.get("email");
        if (email) filter.user_email = { $regex: email, $options: "i" };

        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        if (from || to) {
            filter.created_at = {};
            if (from) filter.created_at.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setUTCHours(23, 59, 59, 999);
                filter.created_at.$lte = toDate;
            }
        }

        // If category text filter supplied, resolve the category ID first
        const categorySearch = url.searchParams.get("category");
        if (categorySearch) {
            const matchingCategories = await Category.find({
                name: { $regex: categorySearch, $options: "i" },
            })
                .select("_id")
                .lean<{ _id: any }[]>();
            filter.category_id = { $in: matchingCategories.map((c) => c._id) };
        }

        // Fetch and populate category
        const rawJobs = await Job.find(filter).sort({ created_at: -1 }).limit(100).populate("category_id", "name").lean<any[]>();

        const jobs = rawJobs.map((job) => ({
            jobId: job._id.toString(),
            referenceId: job.reference_id || job._id.toString().slice(-6).toUpperCase(),
            status: job.status,
            category: (job.category_id as any)?.name ?? "Unknown",
            userEmail: job.user_email ?? "N/A",
            userName: job.user_name ?? "N/A",
            urgency: job.urgency ?? "Routine",
            createdAt: job.created_at ?? new Date().toISOString(),
            updatedAt: job.state_transitioned_at ?? new Date().toISOString(),
            marketingConsent: job.marketing_consent ?? false,
            disclaimerAcknowledged: job.disclaimer_acknowledged ?? false,
            previousState: job.previous_state ?? "NONE",
        }));

        return NextResponse.json({ jobs });
    } catch (error: any) {
        console.error("[admin/jobs GET]", error);
        return NextResponse.json({ error: "Failed to retrieve jobs" }, { status: 500 });
    }
}
