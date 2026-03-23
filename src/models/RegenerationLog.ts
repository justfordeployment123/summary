// src/models/RegenerationLog.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IRegenerationLog extends Document {
    job_id: mongoose.Types.ObjectId;
    triggered_by_admin_id: string; // admin user ID or email
    attempt_number: number; // 1-based attempt count for this job
    status: "triggered" | "completed" | "failed";
    created_at: Date;
}

const RegenerationLogSchema: Schema = new Schema({
    job_id: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        index: true,
    },
    triggered_by_admin_id: {
        type: String,
        required: true,
    },
    attempt_number: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["triggered", "completed", "failed"],
        default: "triggered",
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

export const RegenerationLog = mongoose.models.RegenerationLog || mongoose.model<IRegenerationLog>("RegenerationLog", RegenerationLogSchema);
