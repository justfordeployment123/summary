// src/models/FeedbackSurvey.ts

import mongoose from "mongoose";

export enum SurveyType {
    FREE_SUMMARY = "free_summary",
    FULL_BREAKDOWN = "full_breakdown",
}

export enum UrgencyLabel {
    ROUTINE = "Routine",
    IMPORTANT = "Important",
    TIME_SENSITIVE = "Time-Sensitive",
}

const FeedbackSurveySchema = new mongoose.Schema(
    {
        // ── Survey Classification ──────────────────────────────────────────────
        survey_type: {
            type: String,
            enum: Object.values(SurveyType),
            required: true,
            index: true,
        },

        // ── Job / Session Reference ───────────────────────────────────────────
        job_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
            index: true,
        },
        // Denormalized for easy querying without joining Job
        reference_id: { type: String }, // Job.reference_id

        // ── Letter Context ────────────────────────────────────────────────────
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
        },
        category_name: { type: String }, // denormalized for easier reporting
        urgency_label: {
            type: String,
            enum: Object.values(UrgencyLabel),
        },

        // ── Ratings (1–5 scale) ───────────────────────────────────────────────
        // Free Summary ratings
        rating_ease_of_understanding: { type: Number, min: 1, max: 5 },
        rating_helpfulness: { type: Number, min: 1, max: 5 },
        rating_accuracy: { type: Number, min: 1, max: 5 },
        rating_urgency_clarity: { type: Number, min: 1, max: 5 },
        rating_likelihood_to_upgrade: { type: Number, min: 1, max: 5 },

        // Full Breakdown ratings (reuse same fields but with different semantic meaning)
        // rating_ease_of_understanding -> "How clearly did the breakdown explain your letter?"
        // rating_helpfulness           -> "How helpful were the key points and next steps?"
        // rating_accuracy              -> "How much more useful was the full breakdown than the free summary?"
        // rating_urgency_clarity       -> "How satisfied were you overall?"
        // rating_likelihood_to_upgrade -> "How likely are you to use Explain My Letter again?"

        // ── Optional Text Feedback ────────────────────────────────────────────
        comment: { type: String, default: null, maxlength: 2000 },

        // ── Conversion Tracking ───────────────────────────────────────────────
        converted_to_paid: { type: Boolean, default: false },
        purchase_amount_pence: { type: Number, default: null }, // in pence (GBP)

        // ── Metadata ─────────────────────────────────────────────────────────
        // Average of all five ratings — precomputed for fast analytics queries
        average_rating: { type: Number },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
FeedbackSurveySchema.index({ survey_type: 1, created_at: -1 });
FeedbackSurveySchema.index({ job_id: 1, survey_type: 1 }, { unique: true }); // one survey per type per job
FeedbackSurveySchema.index({ category_id: 1 });
FeedbackSurveySchema.index({ converted_to_paid: 1 });
FeedbackSurveySchema.index({ average_rating: 1 });

// ── Pre-save: compute average_rating ─────────────────────────────────────────
FeedbackSurveySchema.pre("save", async function () {
    // Cast 'this' to 'any' inside the function to bypass strict schema typing
    const doc = this as any;

    const rawRatings = [
        doc.rating_ease_of_understanding,
        doc.rating_helpfulness,
        doc.rating_accuracy,
        doc.rating_urgency_clarity,
        doc.rating_likelihood_to_upgrade,
    ];

    const ratings = rawRatings.filter(
        (r): r is number => typeof r === "number" && r >= 1 && r <= 5,
    );

    if (ratings.length > 0) {
        doc.average_rating = parseFloat(
            (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(2),
        );
    }
    
    // No next() call needed because this is an async function!
});

export const FeedbackSurvey =
    mongoose.models.FeedbackSurvey ||
    mongoose.model("FeedbackSurvey", FeedbackSurveySchema);