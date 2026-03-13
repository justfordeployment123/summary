import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect frontend /admin pages and backend /api/admin routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        // Let the user access the frontend login page, and the backend auth routes
        if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/login") || pathname.startsWith("/api/admin/auth/setup")) {
            return NextResponse.next();
        }
        //allow /api/admin/auth/setup
        if (pathname.startsWith("/api/admin/auth/setup")) {
            return NextResponse.next();
        }

        const token = request.cookies.get("admin_token")?.value;

        // If no token, redirect to login (or return 401 for API routes)
        if (!token) {
            if (pathname.startsWith("/api/")) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const loginUrl = new URL("/admin/login", request.url);
            return NextResponse.redirect(loginUrl);
        }

        // --- NEW REDIRECT LOGIC ---
        // If the user is logged in and tries to access the base /admin path,
        // redirect them instantly to the dashboard.
        if (pathname === "/admin") {
            return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
