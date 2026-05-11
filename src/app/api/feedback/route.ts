// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SurveyType, UrgencyLabel } from "@prisma/client";
import { sendFeedbackNotificationEmail } from "@/app/api/admin/feedback/route";

function isValidRating(r: unknown): r is number {
    return typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 5;
}

function isValidSurveyType(t: unknown): t is SurveyType {
    return Object.values(SurveyType).includes(t as SurveyType);
}

async function computePurchaseAmountPence(categoryId: string, upsellIds: string[]): Promise<number | null> {
    try {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) return null;

        let total = category.base_price;

        if (upsellIds.length > 0) {
            const upsells = await prisma.upsell.findMany({
                where: { id: { in: upsellIds } },
            });

            for (const upsell of upsells) {
                const prices = upsell.category_prices as Record<string, number> | null;
                const price = prices?.[categoryId];
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

        const job = await prisma.job.findFirst({
            where: { id: job_id, access_token },
        });

        if (!job) return NextResponse.json({ error: "Job not found or access denied." }, { status: 403 });

        // ── Explicit duplicate check (mirrors Mongoose version's early return) ──
        const existingSurvey = await prisma.feedbackSurvey.findUnique({
            where: { job_id_survey_type: { job_id, survey_type } },
        });
        if (existingSurvey) return NextResponse.json({ error: "Feedback for this stage has already been submitted." }, { status: 409 });

        const paidStatuses = ["PAYMENT_CONFIRMED", "PAID_BREAKDOWN_GENERATING", "COMPLETED"];
        const converted_to_paid = paidStatuses.includes(job.status);

        const purchase_amount_pence = converted_to_paid ? await computePurchaseAmountPence(job.category_id, job.upsells_purchased || []) : null;

        const categoryDoc = await prisma.category.findUnique({
            where: { id: job.category_id },
        });

        // ── Compute average rating (replaces Mongoose pre-save hook) ──────────
        const validRatings = ratings.filter((r): r is number => typeof r === "number" && r >= 1 && r <= 5);
        const average_rating =
            validRatings.length > 0 ? parseFloat((validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(2)) : null;

        const survey = await prisma.feedbackSurvey.create({
            data: {
                survey_type: survey_type as SurveyType,
                job_id,
                reference_id: job.reference_id,
                category_id: job.category_id,
                category_name: categoryDoc?.name,
                urgency_label: job.urgency as UrgencyLabel | null,
                rating_ease_of_understanding,
                rating_helpfulness,
                rating_accuracy,
                rating_urgency_clarity,
                rating_likelihood_to_upgrade,
                average_rating,
                comment: comment?.trim() || null,
                converted_to_paid,
                purchase_amount_pence,
            },
        });

        // Fire email notification — non-blocking, don't await
        sendFeedbackNotificationEmail({
            survey_type: survey.survey_type,
            reference_id: survey.reference_id,
            urgency_label: survey.urgency_label,
            category_name: survey.category_name,
            rating_ease_of_understanding: survey.rating_ease_of_understanding,
            rating_helpfulness: survey.rating_helpfulness,
            rating_accuracy: survey.rating_accuracy,
            rating_urgency_clarity: survey.rating_urgency_clarity,
            rating_likelihood_to_upgrade: survey.rating_likelihood_to_upgrade,
            average_rating: survey.average_rating,
            comment: survey.comment,
            converted_to_paid: survey.converted_to_paid,
            purchase_amount_pence: survey.purchase_amount_pence,
            created_at: survey.created_at,
        }).catch((err) => console.error("[feedback email]", err));

        return NextResponse.json({ success: true, survey_id: survey.id }, { status: 201 });
    } catch (err: any) {
        console.error("[POST /api/feedback]", err);

        // Prisma unique constraint violation — fallback in case of race condition
        if (err.code === "P2002") {
            return NextResponse.json({ error: "Feedback for this stage has already been submitted." }, { status: 409 });
        }
        return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
    }
}
