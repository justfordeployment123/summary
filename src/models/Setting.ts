// For managing global app limits, pricing toggles, and UI text dynamically
import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
    key: string;
    value: any;
    description: string;
    createdAt: Date;
    updated_at: Date;
}

const SettingSchema: Schema = new Schema(
    {
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
    },
    { timestamps: true },
);

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
