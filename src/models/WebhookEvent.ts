// src/models/WebhookEvent.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IWebhookEvent extends Document {
    stripe_event_id: string;
    event_type: string;
    job_id?: mongoose.Types.ObjectId;
    processed_at: Date;
}

const WebhookEventSchema: Schema = new Schema({
    stripe_event_id: {
        type: String,
        required: true,
        unique: true,
    },
    event_type: {
        type: String,
        required: true,
    },
    job_id: {
        type: Schema.Types.ObjectId,
        ref: "Job",
    },
    processed_at: {
        type: Date,
        default: Date.now,
    },
});

export const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);
