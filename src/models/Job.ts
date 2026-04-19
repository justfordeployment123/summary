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
        reference_id: { type: String, required: true, unique: true },
        access_token: { type: String, default: uuidv4, unique: true },

        status: {
            type: String,
            enum: Object.values(JobState),
            default: JobState.UPLOADED,
            index: true,
        },
        previous_state: { type: String },
        state_transitioned_at: { type: Date, default: Date.now },

        s3_key: { type: String },
        file_name_original: { type: String },
        file_type: { type: String },

        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Category",
        },

        user_email: { type: String, required: true },
        user_name: { type: String, required: true },
        marketing_consent: { type: Boolean, default: false },

        disclaimer_acknowledged: { type: Boolean, default: false },
        disclaimer_acknowledged_at: { type: Date },

        urgency: {
            type: String,
            enum: ["Routine", "Important", "Time-Sensitive"],
        },

        stripe_session_id: { type: String },
        stripe_payment_intent_id: { type: String },
        upsells_purchased: { type: [String], default: [] },

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

// ── Indexes ───────────────────────────────────────────────────────────────────
JobSchema.index({ access_token: 1 });
JobSchema.index({ user_email: 1 });
JobSchema.index({ stripe_session_id: 1 });
JobSchema.index({ stripe_payment_intent_id: 1 });

JobSchema.index({ created_at: 1 }, { background: true });
export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
