// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { FeedbackSurvey, SurveyType } from "@/models/FeedbackSurvey";
import { Job } from "@/models/Job";
import { Category } from "@/models/Category";
import Upsell from "@/models/Upsell"; // default export

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidRating(r: unknown): r is number {
    return typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 5;
}

function isValidSurveyType(t: unknown): t is SurveyType {
    return Object.values(SurveyType).includes(t as SurveyType);
}

// ─── Amount calculator ────────────────────────────────────────────────────────

async function computePurchaseAmountPence(categoryId: mongoose.Types.ObjectId, upsellIds: string[]): Promise<number | null> {
    try {
        const categoryIdStr = categoryId.toString();

        const category = (await Category.findById(categoryId).lean()) as { base_price?: number } | null;
        if (!category || typeof category.base_price !== "number") return null;

        let total = category.base_price;

        if (upsellIds.length > 0) {
            // category_prices is a Mongoose Map — lean() converts it to a plain
            // object with string keys, so bracket access works after lean().
            const upsells = (await Upsell.find({ _id: { $in: upsellIds } }).lean()) as Array<{
                category_prices?: Record<string, number>;
            }>;

            for (const upsell of upsells) {
                const price = upsell.category_prices?.[categoryIdStr];
                if (typeof price === "number" && price > 0) {
                    total += price;
                }
            }
        }

        return total;
    } catch {
        return null; // non-fatal — don't fail the whole request
    }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        const {
            job_id,
            access_token,
            survey_type,
            rating_ease_of_understanding,
            rating_helpfulness,
            rating_accuracy,
            rating_urgency_clarity,
            rating_likelihood_to_upgrade,
            comment,
        } = body;

        // ── 1. Basic input validation ──────────────────────────────────────────
        if (!job_id || !access_token) {
            return NextResponse.json({ error: "Missing job_id or access_token." }, { status: 400 });
        }

        if (!isValidSurveyType(survey_type)) {
            return NextResponse.json({ error: "Invalid survey_type." }, { status: 400 });
        }

        const ratings = [rating_ease_of_understanding, rating_helpfulness, rating_accuracy, rating_urgency_clarity, rating_likelihood_to_upgrade];

        if (!ratings.every(isValidRating)) {
            return NextResponse.json({ error: "All five ratings are required and must be integers between 1 and 5." }, { status: 400 });
        }

        if (comment !== undefined && comment !== null) {
            if (typeof comment !== "string" || comment.length > 2000) {
                return NextResponse.json({ error: "Comment must be a string under 2000 characters." }, { status: 400 });
            }
        }

        // ── 2. Validate job + token ────────────────────────────────────────────
        if (!mongoose.Types.ObjectId.isValid(job_id)) {
            return NextResponse.json({ error: "Invalid job_id." }, { status: 400 });
        }

        const job = (await Job.findOne({ _id: job_id, access_token }).lean()) as {
            _id: mongoose.Types.ObjectId;
            status: string;
            reference_id: string;
            category_id: mongoose.Types.ObjectId;
            urgency?: string;
            upsells_purchased?: string[];
        } | null;

        if (!job) {
            return NextResponse.json({ error: "Job not found or access denied." }, { status: 403 });
        }

        // ── 3. Conversion status + purchase amount ─────────────────────────────
        const paidStatuses = ["PAYMENT_CONFIRMED", "PAID_BREAKDOWN_GENERATING", "COMPLETED"];
        const converted_to_paid = paidStatuses.includes(job.status);

        // Only hit the DB for paid jobs — free summary feedback skips this entirely
        const purchase_amount_pence = converted_to_paid ? await computePurchaseAmountPence(job.category_id, job.upsells_purchased ?? []) : null;

        // ── 4. Duplicate check ─────────────────────────────────────────────────
        const existingSurvey = await FeedbackSurvey.findOne({ job_id, survey_type }).lean();

        if (existingSurvey) {
            return NextResponse.json({ error: "Feedback for this stage has already been submitted." }, { status: 409 });
        }

        // ── 5. Save ────────────────────────────────────────────────────────────
        const survey = new FeedbackSurvey({
            survey_type,
            job_id,
            reference_id: job.reference_id,
            category_id: job.category_id,
            urgency_label: job.urgency ?? null,
            rating_ease_of_understanding,
            rating_helpfulness,
            rating_accuracy,
            rating_urgency_clarity,
            rating_likelihood_to_upgrade,
            comment: comment?.trim() || null,
            converted_to_paid,
            purchase_amount_pence,
        });

        await survey.save();

        return NextResponse.json({ success: true, survey_id: survey._id }, { status: 201 });
    } catch (err: unknown) {
        console.error("[POST /api/feedback]", err);

        if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
            return NextResponse.json({ error: "Feedback for this stage has already been submitted." }, { status: 409 });
        }

        return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
    }
}
