// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { FeedbackSurvey, SurveyType } from "@/models/FeedbackSurvey";
import { Job } from "@/models/Job";
import { Category } from "@/models/Category";
import Upsell from "@/models/Upsell";
import { sendFeedbackNotificationEmail } from "@/app/api/admin/feedback/route";

function isValidRating(r: unknown): r is number {
    return typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 5;
}

function isValidSurveyType(t: unknown): t is SurveyType {
    return Object.values(SurveyType).includes(t as SurveyType);
}

async function computePurchaseAmountPence(categoryId: mongoose.Types.ObjectId, upsellIds: string[]): Promise<number | null> {
    try {
        const categoryIdStr = categoryId.toString();
        const category = (await Category.findById(categoryId).lean()) as { base_price?: number } | null;
        if (!category || typeof category.base_price !== "number") return null;

        let total = category.base_price;

        if (upsellIds.length > 0) {
            const upsells = (await Upsell.find({ _id: { $in: upsellIds } }).lean()) as Array<{
                category_prices?: Record<string, number>;
            }>;
            for (const upsell of upsells) {
                const price = upsell.category_prices?.[categoryIdStr];
                if (typeof price === "number" && price > 0) total += price;
            }
        }

        return total;
    } catch {
        return null;
    }
}

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

        if (!job_id || !access_token) return NextResponse.json({ error: "Missing job_id or access_token." }, { status: 400 });

        if (!isValidSurveyType(survey_type)) return NextResponse.json({ error: "Invalid survey_type." }, { status: 400 });

        const ratings = [rating_ease_of_understanding, rating_helpfulness, rating_accuracy, rating_urgency_clarity, rating_likelihood_to_upgrade];

        if (!ratings.every(isValidRating))
            return NextResponse.json({ error: "All five ratings are required and must be integers between 1 and 5." }, { status: 400 });

        if (comment !== undefined && comment !== null) {
            if (typeof comment !== "string" || comment.length > 2000)
                return NextResponse.json({ error: "Comment must be a string under 2000 characters." }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(job_id)) return NextResponse.json({ error: "Invalid job_id." }, { status: 400 });

        const job = (await Job.findOne({ _id: job_id, access_token }).lean()) as {
            _id: mongoose.Types.ObjectId;
            status: string;
            reference_id: string;
            category_id: mongoose.Types.ObjectId;
            urgency?: string;
            upsells_purchased?: string[];
        } | null;

        if (!job) return NextResponse.json({ error: "Job not found or access denied." }, { status: 403 });

        const paidStatuses = ["PAYMENT_CONFIRMED", "PAID_BREAKDOWN_GENERATING", "COMPLETED"];
        const converted_to_paid = paidStatuses.includes(job.status);

        const purchase_amount_pence = converted_to_paid ? await computePurchaseAmountPence(job.category_id, job.upsells_purchased ?? []) : null;

        const existingSurvey = await FeedbackSurvey.findOne({ job_id, survey_type }).lean();
        if (existingSurvey) return NextResponse.json({ error: "Feedback for this stage has already been submitted." }, { status: 409 });

        // Look up category name for the email
        const categoryDoc = (await Category.findById(job.category_id).lean()) as { name?: string } | null;

        const survey = new FeedbackSurvey({
            survey_type,
            job_id,
            reference_id: job.reference_id,
            category_id: job.category_id,
            category_name: categoryDoc?.name ?? undefined,
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

        // Fire email notification — non-blocking, don't await
        sendFeedbackNotificationEmail({
            survey_type,
            reference_id: job.reference_id,
            urgency_label: job.urgency,
            category_name: categoryDoc?.name,
            rating_ease_of_understanding,
            rating_helpfulness,
            rating_accuracy,
            rating_urgency_clarity,
            rating_likelihood_to_upgrade,
            average_rating: survey.average_rating,
            comment: comment?.trim() || null,
            converted_to_paid,
            purchase_amount_pence,
            created_at: survey.created_at,
        }).catch((err) => console.error("[feedback email]", err));

        return NextResponse.json({ success: true, survey_id: survey._id }, { status: 201 });
    } catch (err: unknown) {
        console.error("[POST /api/feedback]", err);
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
            return NextResponse.json({ error: "Feedback for this stage has already been submitted." }, { status: 409 });
        }
        return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
    }
}
