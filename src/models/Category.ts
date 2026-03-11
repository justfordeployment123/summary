import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    name: string;
    slug: string;
    base_price: number; // Stored in pennies (e.g., 499 for £4.99)
    is_active: boolean;
    created_at: Date;
}

const CategorySchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    base_price: {
        type: Number,
        required: true,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

export const Category = mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
