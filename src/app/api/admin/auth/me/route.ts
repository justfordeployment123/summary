// src/app/api/admin/auth/me/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
    try {
        // 1. Grab the secure cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Not logged in" }, { status: 401 });
        }

        // 2. Verify the token using your secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            adminId: string;
            email: string;
            role: string;
        };

        // 3. Return sanitized user data (NEVER send the password hash!)
        return NextResponse.json(
            {
                user: {
                    id: decoded.adminId,
                    email: decoded.email,
                    role: decoded.role,
                },
            },
            { status: 200 },
        );
    } catch (error: any) {
        return NextResponse.json({ error: "Session invalid or expired" }, { status: 401 });
    }
}