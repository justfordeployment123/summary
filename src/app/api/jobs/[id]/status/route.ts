// src/app/api/jobs/[jobId]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";

export async function GET(
    req: NextRequest, // Changed from Request to NextRequest
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        await connectToDatabase();

        // 1. Await params explicitly
        const resolvedParams = await params;
        const jobId = resolvedParams.id;

        console.log(resolvedParams, "Resolved params for job status request"); // Debug log to verify params structure

        // 2. Safely get the token using NextUrl
        const token = req.nextUrl.searchParams.get("token");

        console.log(`[jobs/status] Received request for jobId: ${jobId} with token: ${token}`);

        // Useful for debugging if it happens again
        if (!jobId || !token) {
            console.error("Validation Failed -> jobId:", jobId, "| token:", token);
            return NextResponse.json({ error: "Missing job ID or access token." }, { status: 400 });
        }

        // ── Token + job lookup ──
        const job = await Job.findOne({
            _id: jobId,
            access_token: token,
        }).lean<any>();

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        // ── Return status-appropriate response ──
        const base = {
            status: job.status,
            urgency: job.urgency ?? null,
            referenceId: job.reference_id ?? null,
        };

        if (job.status === "COMPLETED") {
            if (!job.stripe_payment_intent_id) {
                return NextResponse.json({ error: "Payment not confirmed." }, { status: 403 });
            }

            return NextResponse.json({
                ...base,
                detailedBreakdown: job.paid_summary,
            });
        }

        if (job.status === "FAILED") {
            return NextResponse.json({
                ...base,
                error: "Processing failed. Please contact support.",
            });
        }

        return NextResponse.json(base);
    } catch (error: any) {
        console.error("[jobs/status]", error);
        return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
    }
}
