// src/proxy.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Rate limiting store ──────────────────────────────────────────────────────
// In-memory per-process store. Fine for a single VPS with PM2.
// For multi-instance deployments, swap for Redis (upstash/ioredis).

const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: { pattern: RegExp; maxRequests: number; windowMs: number }[] = [
    // Upload + process: 5 per 60s — most strictly throttled (§19)
    { pattern: /^\/api\/(upload|process)/, maxRequests: 5, windowMs: 60_000 },
    // Checkout + payment intent: 10 per 60s
    { pattern: /^\/api\/(checkout|create-payment-intent)/, maxRequests: 10, windowMs: 60_000 },
    // Admin auth login: 10 per 60s — prevent brute force
    { pattern: /^\/api\/admin\/auth\/login/, maxRequests: 10, windowMs: 60_000 },
    // General API: 60 per 60s
    { pattern: /^\/api\//, maxRequests: 60, windowMs: 60_000 },
];

// Clean expired entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of ipRequestMap.entries()) {
        if (now > value.resetAt) ipRequestMap.delete(key);
    }
}, 5 * 60_000);

function getClientIp(req: NextRequest): string {
    // X-Real-IP is set by Nginx proxy_set_header X-Real-IP $remote_addr
    return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function checkRateLimit(ip: string, patternKey: string, maxRequests: number, windowMs: number): boolean {
    const mapKey = `${ip}:${patternKey}`;
    const now = Date.now();
    const entry = ipRequestMap.get(mapKey);

    if (!entry || now > entry.resetAt) {
        ipRequestMap.set(mapKey, { count: 1, resetAt: now + windowMs });
        return false; // not limited
    }

    entry.count++;
    ipRequestMap.set(mapKey, entry);
    return entry.count > maxRequests; // true = limited
}

// ─── Proxy (formerly Middleware) ──────────────────────────────────────────────

// FIX: Renamed from 'export function middleware' to 'export default function proxy'
export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── 1. Rate limiting (API routes only) ───────────────────────────────────
    if (pathname.startsWith("/api/")) {
        // Exclude Stripe webhooks — Stripe retries need to get through.
        // Webhook security is handled by signature verification, not rate limiting.
        const isWebhook = pathname.startsWith("/api/webhook") || pathname.startsWith("/api/webhooks");

        if (!isWebhook) {
            const ip = getClientIp(request);

            for (const { pattern, maxRequests, windowMs } of RATE_LIMITS) {
                if (pattern.test(pathname)) {
                    if (checkRateLimit(ip, pattern.source, maxRequests, windowMs)) {
                        return NextResponse.json(
                            { error: "Too many requests. Please try again shortly." },
                            {
                                status: 429,
                                headers: {
                                    "Retry-After": String(Math.ceil(windowMs / 1000)),
                                    "X-RateLimit-Limit": String(maxRequests),
                                },
                            },
                        );
                    }
                    break; // First matching pattern wins
                }
            }
        }
    }

    // ── 2. Admin auth protection ──────────────────────────────────────────────
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        // Always allow the login page and auth routes through
        if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/login") || pathname.startsWith("/api/admin/auth/setup")) {
            return NextResponse.next();
        }

        const token = request.cookies.get("admin_token")?.value;

        if (!token) {
            // API routes return 401, page routes redirect to login
            if (pathname.startsWith("/api/")) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        // Redirect /admin → /admin/dashboard for logged-in users
        if (pathname === "/admin") {
            return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // Runs on all admin pages, all admin API routes, and all public API routes
    matcher: ["/admin/:path*", "/api/:path*"],
};
