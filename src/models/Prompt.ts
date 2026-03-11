// To allow admins to tweak the OpenAI prompts without touching the codebase
import mongoose, { Schema, Document } from "mongoose";

export interface IPrompt extends Document {
    category_id?: mongoose.Types.ObjectId; // Optional: If null, it's a generic prompt
    type: "free" | "paid" | "upsell";
    prompt_text: string;
    version: number;
    is_active: boolean;
    updated_at: Date;
}

const PromptSchema: Schema = new Schema({
    category_id: {
        type: Schema.Types.ObjectId,
        ref: "Category",
    },
    type: {
        type: String,
        enum: ["free", "paid", "upsell"],
        required: true,
    },
    prompt_text: {
        type: String,
        required: true,
    },
    version: {
        type: Number,
        default: 1,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

export const Prompt = mongoose.models.Prompt || mongoose.model<IPrompt>("Prompt", PromptSchema);
