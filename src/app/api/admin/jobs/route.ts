import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";

export async function GET(request: Request) {
    try {
        await dbConnect();
        const url = new URL(request.url);
        
        // Build the MongoDB filter object dynamically based on URL params
        const filter: any = {};
        
        const status = url.searchParams.get("status");
        if (status && status !== "All") filter.status = status;

        const category = url.searchParams.get("category");
        if (category) filter.category_id = { $regex: category, $options: "i" };

        const email = url.searchParams.get("email");
        if (email) filter.user_email = { $regex: email, $options: "i" };

        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        if (from || to) {
            filter.created_at = {};
            if (from) filter.created_at.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setUTCHours(23, 59, 59, 999); // Include the whole end day
                filter.created_at.$lte = toDate;
            }
        }

        // Fetch jobs, sorted newest first
        const rawJobs = await Job.find(filter).sort({ created_at: -1 }).limit(100);

        // Map to match the frontend interface exactly
        const jobs = rawJobs.map((job) => ({
            jobId: job._id.toString(),
            referenceId: job.reference_id || job._id.toString().slice(-6).toUpperCase(),
            status: job.status,
            category: job.category_id || "Unknown",
            userEmail: job.user_email || "N/A",
            userName: job.user_name || "N/A",
            urgency: job.urgency || "Routine",
            createdAt: job.created_at || new Date().toISOString(),
            updatedAt: job.state_transitioned_at || new Date().toISOString(),
            marketingConsent: job.marketing_consent || false,
            disclaimerAcknowledged: job.disclaimer_acknowledged || false,
            previousState: job.previous_state || "NONE",
        }));

        return NextResponse.json({ jobs });
    } catch (error: any) {
        console.error("Admin Jobs GET Error:", error);
        return NextResponse.json({ error: "Failed to retrieve jobs" }, { status: 500 });
    }
}