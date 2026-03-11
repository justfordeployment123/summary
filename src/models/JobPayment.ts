import mongoose, { Schema, Document } from "mongoose";

export interface IJobPayment extends Document {
    job_id: mongoose.Types.ObjectId;
    stripe_session_id: string;
    stripe_payment_intent_id?: string;
    amount: number;
    currency: string;
    status: "pending" | "completed" | "failed";
    upsells_purchased: string[];
    created_at: Date;
}

const JobPaymentSchema: Schema = new Schema({
    job_id: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
    },
    stripe_session_id: {
        type: String,
        required: true,
    },
    stripe_payment_intent_id: { type: String },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: "gbp",
    },
    status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
    },
    upsells_purchased: [
        {
            type: String,
        },
    ],
    created_at: {
        type: Date,
        default: Date.now,
    },
});

export const JobPayment = mongoose.models.JobPayment || mongoose.model<IJobPayment>("JobPayment", JobPaymentSchema);
