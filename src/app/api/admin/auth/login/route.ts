import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import { AdminUser } from "@/models/AdminUser";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        await dbConnect();

        // 1. Find the admin user
        const admin = await AdminUser.findOne({ email: email.toLowerCase() });
        if (!admin) {
            // We return a generic error to prevent email enumeration
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 2. Verify the password
        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 3. Update last login timestamp
        admin.last_login = new Date();
        await admin.save();

        // 4. Generate the JWT
        const token = jwt.sign(
            { 
                adminId: admin._id, 
                email: admin.email, 
                role: admin.role 
            },
            process.env.JWT_SECRET!,
            { expiresIn: "8h" } // Session expires in 8 hours
        );

        // 5. Create the response and set the HTTP-only cookie
        const response = NextResponse.json(
            { message: "Login successful", role: admin.role },
            { status: 200 }
        );

        response.cookies.set({
            name: "admin_token",
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 8 * 60 * 60, // 8 hours in seconds
        });

        return response;

    } catch (error: any) {
        console.error("Login Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}