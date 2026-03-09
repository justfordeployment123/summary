import { JobState } from "@/types/job";
import mongoose from "mongoose";
import { JobStateLog } from "@/models/JobStateLog";
import { Job } from "@/models/Job";
export async function transitionJobState(
    jobId: string,
    newState: JobState,
    triggeredBy: string,
    session?: mongoose.ClientSession, // Optional session for MongoDB transactions
) {
    // 1. Fetch current job
    const job = await Job.findById(jobId).session(session || null);
    if (!job) throw new Error("Job not found");

    const oldState = job.status;

    // 2. Update the Job document
    job.previous_state = oldState;
    job.status = newState;
    job.state_transitioned_at = new Date();
    await job.save({ session: session || undefined });

    // 3. Write to the Audit Log
    await JobStateLog.create(
        [
            {
                job_id: jobId,
                from_state: oldState,
                to_state: newState,
                triggered_by: triggeredBy,
            },
        ],
        { session: session || undefined },
    );

    return job;
}
