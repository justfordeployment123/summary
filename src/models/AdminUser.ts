import mongoose, { Schema, Document } from "mongoose";

export interface IAdminUser extends Document {
    email: string;
    password_hash: string;
    role: "superadmin" | "editor" | "support";
    last_login?: Date;
    created_at: Date;
}

const AdminUserSchema: Schema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password_hash: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["superadmin", "editor", "support"],
        default: "support",
    },
    last_login: {
        type: Date,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

export const AdminUser = mongoose.models.AdminUser || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
