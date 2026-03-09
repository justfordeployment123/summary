import mongoose, { Schema } from "mongoose";

const JobStateLogSchema = new Schema(
    {
        job_id: {
            type: Schema.Types.ObjectId,
            ref: "Job",
            required: true,
        },
        from_state: {
            type: String,
            required: true,
        },
        to_state: {
            type: String,
            required: true,
        },
        triggered_by: {
            type: String,
            required: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

export const JobStateLog = mongoose.models.JobStateLog || mongoose.model("JobStateLog", JobStateLogSchema);
