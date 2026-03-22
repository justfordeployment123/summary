import mongoose, { Schema, Document } from "mongoose";

/**
 * PromptVersion — stores a historical snapshot of a Prompt's text
 * every time an admin saves a new version via PUT /api/admin/prompts/[id].
 *
 * This enables the "Version History" panel in the admin prompts page,
 * allowing any past version to be inspected and restored.
 *
 * Per requirements (Section 10.2):
 *   "Prompt versioning: previous versions retained for rollback."
 */
export interface IPromptVersion extends Document {
    /** Reference to the parent Prompt document */
    prompt_id: mongoose.Types.ObjectId;

    /** The version number this snapshot was captured at (before the save that bumped it) */
    version: number;

    /** The prompt text as it existed at this version */
    prompt_text: string;

    /** Timestamp when this version was the live version (i.e. when it was superseded) */
    updated_at: Date;
}

const PromptVersionSchema: Schema = new Schema({
    prompt_id: {
        type: Schema.Types.ObjectId,
        ref: "Prompt",
        required: true,
        index: true,
    },
    version: {
        type: Number,
        required: true,
    },
    prompt_text: {
        type: String,
        required: true,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

// Compound index: efficiently fetch all versions of a prompt sorted by version desc
PromptVersionSchema.index({ prompt_id: 1, version: -1 });

export const PromptVersion = mongoose.models.PromptVersion || mongoose.model<IPromptVersion>("PromptVersion", PromptVersionSchema);
