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
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Category",
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
        disclaimer_acknowledged_at: {
            type: Date,
        },
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

        // --- NEW FIELDS ADDED ---
        processed_at: {
            type: Date,
        },
        deleted_at: {
            type: Date,
        },
        paid_summary: { type: String, default: null },
    },
    {
        // Force Mongoose to use snake_case for timestamps so it matches your DB queries
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);

export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
