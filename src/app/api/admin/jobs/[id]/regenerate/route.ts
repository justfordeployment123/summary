import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobPayment } from "@/models/JobPayment";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const job = await Job.findById(id);
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Requirement 8.3: Job must be FAILED to be regenerated
        if (job.status !== JobState.FAILED) {
            return NextResponse.json({ error: "Only FAILED jobs can be regenerated" }, { status: 400 });
        }

        // Verify payment actually completed before allowing regeneration
        const payment = await JobPayment.findOne({ job_id: id });
        if (!payment || payment.status !== "completed") {
            return NextResponse.json({ error: "Cannot regenerate: Payment not completed" }, { status: 400 });
        }

        // Reset the job state to allow the generator to pick it up
        job.previous_state = job.status;
        job.status = JobState.PAYMENT_CONFIRMED; 
        job.state_transitioned_at = new Date();
        await job.save();

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.FAILED,
            to_state: JobState.PAYMENT_CONFIRMED,
            triggered_by: "admin_regeneration",
        });

        // Re-trigger the background generation route just like the webhook does
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/generate-paid`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: job._id })
        }).catch(err => console.error("Admin regeneration background trigger failed:", err));

        return NextResponse.json({ message: "Regeneration triggered successfully" });
    } catch (error: any) {
        console.error("Regeneration Error:", error);
        return NextResponse.json({ error: "Failed to trigger regeneration" }, { status: 500 });
    }
}