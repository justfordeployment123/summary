import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { AdminUser } from "@/models/AdminUser";

export async function POST(request: Request) {
    try {
        // IMPORTANT: Add a secret key check here so no one else can hit this route!
        const { email, password, setupSecret } = await request.json();
        console.log(email, password, setupSecret);
        // Replace 'my_secret_setup_key' with a random word just for this test
        if (setupSecret !== "my_secret_setup_key") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();

        // Check if admin already exists
        const existingAdmin = await AdminUser.findOne({ email: email.toLowerCase() });
        if (existingAdmin) {
            return NextResponse.json({ error: "Admin already exists" }, { status: 400 });
        }

        // Hash the password securely
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create the superadmin
        const admin = await AdminUser.create({
            email: email.toLowerCase(),
            password_hash,
            role: "superadmin"
        });

        return NextResponse.json({ message: "Superadmin created successfully", email: admin.email }, { status: 201 });

    } catch (error: any) {
        console.error("Setup Error:", error);
        return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
    }
}