import mongoose, { Schema, Document } from "mongoose";

export interface IUpsell extends Document {
    name: string;
    description: string;
    is_active: boolean;
    // Maps a Category ID (string) to a price in pence (number)
    category_prices: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const UpsellSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        is_active: { type: Boolean, default: true },
        category_prices: {
            type: Map,
            of: Number,
            default: {},
        },
    },
    { timestamps: true },
);

export default mongoose.models.Upsell || mongoose.model<IUpsell>("Upsell", UpsellSchema);
