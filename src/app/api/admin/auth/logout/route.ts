import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Delete the session cookie
        cookieStore.delete("admin_token");

        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
    } catch (error) {
        console.error("Logout Error:", error);
        return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
    }
}
