import mongoose, { Schema, Document } from "mongoose";

export interface ITemp extends Document {
    job_id: string;
    extracted_text: string;
    createdAt: Date;
}

const TempSchema: Schema = new Schema({
    job_id: { type: String, required: true, unique: true, index: true },
    extracted_text: { type: String, required: true },
    // MongoDB TTL Index: Auto-deletes this document 24 hours after creation as a failsafe
    createdAt: { type: Date, expires: 86400, default: Date.now } 
});

export default mongoose.models.Temp || mongoose.model<ITemp>("Temp", TempSchema);