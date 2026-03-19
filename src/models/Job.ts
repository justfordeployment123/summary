// import mongoose, { Schema, Document } from "mongoose";
// import { v4 as uuidv4 } from "uuid";
// import { JobState } from "@/types/job";

// const JobSchema = new mongoose.Schema(
//     {
//         reference_id: {
//             type: String,
//             required: true,
//             unique: true,
//         },
//         access_token: {
//             type: String,
//             default: uuidv4,
//             unique: true,
//         },
//         status: {
//             type: String,
//             enum: Object.values(JobState),
//             default: JobState.UPLOADED,
//         },
//         category_id: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true,
//             ref: "Category",
//         },
//         user_email: {
//             type: String,
//             required: true,
//         },
//         user_name: {
//             type: String,
//             required: true,
//         },
//         marketing_consent: {
//             type: Boolean,
//             default: false,
//         },
//         disclaimer_acknowledged: {
//             type: Boolean,
//             default: false,
//         },
//         disclaimer_acknowledged_at: {
//             type: Date,
//         },
//         urgency: {
//             type: String,
//             enum: ["Routine", "Important", "Time-Sensitive"],
//         },
//         previous_state: {
//             type: String,
//         },
//         state_transitioned_at: {
//             type: Date,
//             default: Date.now,
//         },

//         // --- NEW FIELDS ADDED ---
//         processed_at: {
//             type: Date,
//         },
//         deleted_at: {
//             type: Date,
//         },
//         paid_summary: { type: String, default: null },
//     },
//     {
//         // Force Mongoose to use snake_case for timestamps so it matches your DB queries
//         timestamps: {
//             createdAt: "created_at",
//             updatedAt: "updated_at",
//         },
//     },
// );

// export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

// src/models/Job.ts
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

export enum JobState {
    UPLOADED = "UPLOADED",
    OCR_PROCESSING = "OCR_PROCESSING",
    OCR_FAILED = "OCR_FAILED",
    FREE_SUMMARY_GENERATING = "FREE_SUMMARY_GENERATING",
    FREE_SUMMARY_COMPLETE = "FREE_SUMMARY_COMPLETE",
    AWAITING_PAYMENT = "AWAITING_PAYMENT",
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
    PAID_BREAKDOWN_GENERATING = "PAID_BREAKDOWN_GENERATING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
}

const JobSchema = new mongoose.Schema(
    {
        // ── Identity ──
        reference_id: { type: String, required: true, unique: true },
        access_token: { type: String, default: uuidv4, unique: true },

        // ── State machine (§6) ──
        status: {
            type: String,
            enum: Object.values(JobState),
            default: JobState.UPLOADED,
        },
        previous_state: { type: String },
        state_transitioned_at: { type: Date, default: Date.now },

        // ── File ──
        s3_key: { type: String },                   // UUID key in S3
        file_name_original: { type: String },        // Original filename (metadata only, §4.3)
        file_type: { type: String },

        // ── References ──
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Category",
        },

        // ── User data ──
        user_email: { type: String, required: true },
        user_name: { type: String, required: true },
        marketing_consent: { type: Boolean, default: false },

        // ── Disclaimer (§13) ──
        disclaimer_acknowledged: { type: Boolean, default: false },
        disclaimer_acknowledged_at: { type: Date },

        // ── AI Results ──
        urgency: {
            type: String,
            enum: ["Routine", "Important", "Time-Sensitive"],
        },
        free_summary: { type: String, default: null },
        paid_summary: { type: String, default: null },

        // ── Temporary extracted text (cleared after paid generation, §4.3) ──
        // NOTE: This is NOT permanently stored — cleared after paid breakdown completes.
        extracted_text_temp: { type: String, default: null, select: false },

        // ── Payment ──
        stripe_session_id: { type: String },
        stripe_payment_intent_id: { type: String },
        upsells_purchased: { type: [String], default: [] },

        // ── Timestamps ──
        processed_at: { type: Date },
        deleted_at: { type: Date },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);

// ── Indexes ──
JobSchema.index({ access_token: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ user_email: 1 });
JobSchema.index({ stripe_session_id: 1 });
// TTL: auto-delete jobs after 12 months (§21)
JobSchema.index({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);