import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";

/**
 * GET /api/jobs/[id]/status?token=[accessToken]
 * Requirement 7.2 & 7.3: Token-Gated access to job state and paid content.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        // 1. Next.js 15: Await params to access the job ID
        const { id } = await params;

        // 2. Extract the UUID access token from the URL query parameters
        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        // Requirement 7.3: Requests without a valid token return HTTP 403 
        if (!id || !token) {
            return NextResponse.json(
                { error: "Missing job ID or access token" }, 
                { status: 400 }
            );
        }

        // 3. Fetch the job from the database
        const job = await Job.findById(id);

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // 4. URL Enumeration Guard: Verify the provided token matches the cryptographically 
        // random UUID (v4) assigned at creation.
        if (job.access_token !== token) {
            return NextResponse.json(
                { error: "Unauthorized: Invalid access token" }, 
                { status: 403 }
            );
        }

        /**
         * 5. Build the Response Payload
         * Includes the reference ID (last 6 chars of ID) as per Requirement 4.6[cite: 46].
         */
        const responsePayload: any = {
            status: job.status,
            referenceId: job._id.toString().slice(-6).toUpperCase(),
            urgency: job.urgency || "Routine",
        };

        /**
         * 6. Paid Content Guard (Requirement 7.3 )
         * ONLY attach the detailed breakdown if:
         * - Job status is COMPLETED
         * - The paid_summary exists in the database
         */
        if (job.status === JobState.COMPLETED && job.paid_summary) {
            responsePayload.detailedBreakdown = job.paid_summary;
        }

        // Return 200 OK - the success page will use this to update the UI
        return NextResponse.json(responsePayload, { status: 200 });

    } catch (error: any) {
        console.error("Job Polling Error:", error);
        return NextResponse.json(
            { error: "Failed to retrieve job status" }, 
            { status: 500 }
        );
    }
}