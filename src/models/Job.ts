// src/models/Job.ts
//
// Schema decisions vs requirements:
//
// extracted_text_temp — REMOVED (§21: "Not written to DB. Memory only during
//   processing."). Extracted text lives exclusively in the Temp collection
//   (24-hr TTL) until the webhook reads it for paid generation, then is deleted.
//
// free_summary — KEPT but treated as temporary (§11: "Summary text temporarily
//   linked to job. Not permanently stored beyond job lifecycle."). It must be
//   stored so the results page can display it after OCR completes and while the
//   user decides whether to pay. It is cleared when the job is cleaned up at the
//   12-month TTL, or can be nulled earlier in a cleanup job. It is NOT returned
//   from the status endpoint for completed jobs — only displayed on the summary
//   view which the frontend holds in component state (sessionStorage).
//
// paid_summary — KEPT permanently within the job lifecycle (§16: "After payment:
//   full structured breakdown displayed below summary." §7.3: "Download endpoints
//   check job state === COMPLETED AND payment_status === confirmed before serving
//   files."). The status endpoint reads job.paid_summary to return the breakdown
//   to the frontend on polling completion. Without it, there is no way to serve
//   the paid result. It is cleared when the job TTL expires (12 months, §21).

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
        // ── Identity ──────────────────────────────────────────────────────────
        reference_id: { type: String, required: true, unique: true },
        access_token: { type: String, default: uuidv4, unique: true },

        // ── State machine (§6) ───────────────────────────────────────────────
        status: {
            type: String,
            enum: Object.values(JobState),
            default: JobState.UPLOADED,
            index: true,
        },
        previous_state: { type: String },
        state_transitioned_at: { type: Date, default: Date.now },

        // ── File metadata (§4.3) ─────────────────────────────────────────────
        // S3 key is a UUID — original filename stored as metadata only, never
        // used as an S3 key (§4.2).
        s3_key: { type: String },
        file_name_original: { type: String },
        file_type: { type: String },

        // ── Category reference ───────────────────────────────────────────────
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Category",
        },

        // ── User data (§12) ──────────────────────────────────────────────────
        user_email: { type: String, required: true },
        user_name: { type: String, required: true },
        marketing_consent: { type: Boolean, default: false },

        // ── Disclaimer acknowledgement (§13) ─────────────────────────────────
        disclaimer_acknowledged: { type: Boolean, default: false },
        disclaimer_acknowledged_at: { type: Date },

        // ── AI results ───────────────────────────────────────────────────────
        // urgency: set by generate-free, displayed on results page and used by
        // generate-paid to hydrate the {{urgency}} placeholder in paid prompts.
        urgency: {
            type: String,
            enum: ["Routine", "Important", "Time-Sensitive"],
        },

        // free_summary: stored temporarily so the results page can display it
        // while the user decides to pay (§11). Not returned by the status
        // endpoint for COMPLETED jobs — the frontend holds it in sessionStorage.
        // Cleared at 12-month job TTL (§21). NOT the same as extracted_text
        // which must never be stored in the DB at all (§21).
        free_summary: { type: String, default: null },

        // paid_summary: the full structured breakdown returned after payment.
        // Must be stored so the status polling endpoint can return it to the
        // frontend when the job reaches COMPLETED (§16, §7.3). Cleared at
        // 12-month job TTL (§21).
        paid_summary: { type: String, default: null },

        // NOTE: extracted_text is intentionally absent. Raw OCR/parsed text
        // lives only in the Temp collection (24-hr TTL). See src/models/Temp.ts.
        // It is NEVER written to this collection (§21).

        // ── Payment ──────────────────────────────────────────────────────────
        stripe_session_id: { type: String },
        stripe_payment_intent_id: { type: String },
        upsells_purchased: { type: [String], default: [] },

        // ── Lifecycle timestamps ─────────────────────────────────────────────
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

// Add this line to your schema:
JobSchema.index({ created_at: 1 }, { background: true });
export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
