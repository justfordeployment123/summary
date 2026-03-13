import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
    {
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
            type: Number, // Stored in pennies (e.g., 499 for £4.99)
            required: true,
            default: 499, 
        },
        is_active: {
            type: Boolean,
            default: true,
        },
    },
    { 
        timestamps: { 
            createdAt: 'created_at', 
            updatedAt: false // We only need created_at based on your schema list
        } 
    }
);

export const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);