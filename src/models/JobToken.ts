import mongoose, { Schema, Document } from "mongoose";

export interface IJobToken extends Document {
    job_id: mongoose.Types.ObjectId;
    prompt_type: "free" | "paid" | "upsell";
    tokens_in: number;
    tokens_out: number;
    cost_estimate: number;
    ai_model: string; // <-- Renamed to avoid Mongoose collision
    attempt_number: number;
    created_at: Date;
}

const JobTokenSchema: Schema = new Schema({
    job_id: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        index: true,
    },
    prompt_type: {
        type: String,
        enum: ["free", "paid", "upsell"],
        required: true,
    },
    tokens_in: {
        type: Number,
        required: true,
    },
    tokens_out: {
        type: Number,
        required: true,
    },
    cost_estimate: {
        type: Number,
        required: true,
    },
    ai_model: {
        // <-- Renamed here too
        type: String,
        required: true,
        default: "gpt-4o",
    },
    attempt_number: {
        type: Number,
        required: true,
        default: 1,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

export const JobToken = mongoose.models.JobToken || mongoose.model<IJobToken>("JobToken", JobTokenSchema);
