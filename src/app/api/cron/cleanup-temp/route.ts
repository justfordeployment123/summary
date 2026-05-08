// src/app/api/cron/cleanup-temp/route.ts
//
// Scheduled cleanup: deletes Temp rows older than 24 hours.
// Trigger this from any external scheduler (Coolify scheduled task, GitHub
// Actions, cron-job.org, etc.) by hitting it with:
//
//     Authorization: Bearer <CRON_SECRET>
//
// The CRON_SECRET env var must be set in production. Recommended cadence: hourly.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TTL_MS = 24 * 60 * 60 * 1000;

function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const auth = req.headers.get("authorization");
    if (!auth) return false;

    const expected = `Bearer ${secret}`;
    return auth.length === expected.length && auth === expected;
}

async function runCleanup() {
    const cutoff = new Date(Date.now() - TTL_MS);
    const { count } = await prisma.temp.deleteMany({
        where: { createdAt: { lt: cutoff } },
    });
    return { deleted: count, cutoff: cutoff.toISOString() };
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await runCleanup();
        console.log("[cron/cleanup-temp]", result);
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("[cron/cleanup-temp]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const GET = POST;
