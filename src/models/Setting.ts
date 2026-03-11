// For managing global app limits, pricing toggles, and UI text dynamically
import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
    key: string;
    value: any;
    description: string;
    updated_at: Date;
}

const SettingSchema: Schema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
    },
    value: {
        type: Schema.Types.Mixed,
        required: true,
    }, // Can be string, number, or JSON
    description: {
        type: String,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
