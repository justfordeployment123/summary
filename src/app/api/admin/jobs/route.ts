// src/app/api/admin/jobs/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { JobState } from "@prisma/client";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        
        // Build the dynamic Prisma 'where' clause
        const filter: any = {};

        const status = url.searchParams.get("status");
        if (status && status !== "All") {
            filter.status = status as JobState;
        }

        const email = url.searchParams.get("email");
        if (email) {
            // Prisma natively handles case-insensitive substring matching
            filter.user_email = { 
                contains: email, 
                mode: "insensitive" 
            };
        }

        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        if (from || to) {
            filter.created_at = {};
            if (from) filter.created_at.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setUTCHours(23, 59, 59, 999);
                filter.created_at.lte = toDate;
            }
        }

        const categorySearch = url.searchParams.get("category");
        if (categorySearch) {
            // Perform a relational filter across the joined Category table in a single query
            filter.category = {
                name: { 
                    contains: categorySearch, 
                    mode: "insensitive" 
                }
            };
        }

        // Fetch jobs, limit to 100, sort descending, and include the category name natively
        const rawJobs = await prisma.job.findMany({
            where: filter,
            orderBy: { created_at: 'desc' },
            take: 100,
            include: {
                category: {
                    select: { name: true }
                }
            }
        });

        // Map output perfectly to your existing frontend expectations
        const jobs = rawJobs.map((job) => ({
            jobId: job.id,
            referenceId: job.reference_id || job.id.slice(-6).toUpperCase(),
            status: job.status,
            category: job.category?.name ?? "Unknown",
            userEmail: job.user_email ?? "N/A",
            userName: job.user_name ?? "N/A",
            urgency: job.urgency ?? "Routine",
            createdAt: job.created_at.toISOString(),
            // Fall back to general updated_at if state_transitioned_at is missing
            updatedAt: job.state_transitioned_at?.toISOString() ?? job.updated_at.toISOString(),
            marketingConsent: job.marketing_consent ?? false,
            disclaimerAcknowledged: job.disclaimer_acknowledged ?? false,
            previousState: job.previous_state ?? "NONE",
        }));

        return NextResponse.json({ jobs });
    } catch (error: any) {
        console.error("[admin/jobs GET]", error);
        return NextResponse.json({ error: "Failed to retrieve jobs" }, { status: 500 });
    }
}