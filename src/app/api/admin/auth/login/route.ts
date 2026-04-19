// src/app/api/admin/auth/login/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // 1. Find the admin user
        const admin = await prisma.adminUser.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!admin) {
            // Generic error to prevent email enumeration
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 2. Verify the password
        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 3. Update last login timestamp
        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { last_login: new Date() },
        });

        // 4. Generate the JWT
        const token = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                role: admin.role,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "8h" },
        );

        // 5. Create the response and set the HTTP-only cookie
        const response = NextResponse.json(
            { message: "Login successful", role: admin.role },
            { status: 200 },
        );

        response.cookies.set({
            name: "admin_token",
            value: token,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: "lax",
            path: "/",
            maxAge: 8 * 60 * 60,
        });

        return response;
    } catch (error: any) {
        console.error("Login Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}