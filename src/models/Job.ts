import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { JobState } from "@/types/job";

const JobSchema = new mongoose.Schema(
    {
        reference_id: {
            type: String,
            required: true,
            unique: true,
        },
        access_token: {
            type: String,
            default: uuidv4,
            unique: true,
        },
        status: {
            type: String,
            enum: Object.values(JobState),
            default: JobState.UPLOADED,
        },
        category_id: {
            type: String,
            required: true,
        },
        user_email: {
            type: String,
            required: true,
        },
        user_name: {
            type: String,
            required: true,
        },
        marketing_consent: {
            type: Boolean,
            default: false,
        },
        disclaimer_acknowledged: {
            type: Boolean,
            default: false,
        },
        disclaimer_acknowledged_at: { type: Date },
        urgency: {
            type: String,
            enum: ["Routine", "Important", "Time-Sensitive"],
        },
        previous_state: {
            type: String,
        },
        state_transitioned_at: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
