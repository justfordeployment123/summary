// src/models/WebhookEvent.ts
// Idempotency store for Stripe webhook events (§7.1)
// Prevents duplicate AI generation on Stripe retries.
import mongoose, { Schema } from "mongoose";

const WebhookEventSchema = new Schema(
    {
        stripe_event_id: {
            type: String,
            required: true,
            unique: true, // DB-level unique constraint prevents race conditions
        },
        event_type: { type: String, required: true },
        job_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            default: null,
        },
        processed_at: { type: Date, default: Date.now },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    },
);

// Index for fast lookup
WebhookEventSchema.index({ stripe_event_id: 1 }, { unique: true });
// TTL index: auto-delete records older than 12 months (§21 retention policy)
WebhookEventSchema.index({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

export default mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", WebhookEventSchema);
