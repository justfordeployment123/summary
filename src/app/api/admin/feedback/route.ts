// src/app/api/admin/feedback/route.ts
//
// GET  /api/admin/feedback  — list feedback with filters + optional CSV export
//
// Query params:
//   survey_type  "free_summary" | "full_breakdown"
//   category_id  UUID string
//   from         ISO date string (start of range, inclusive)
//   to           ISO date string (end of range, inclusive)
//   page         number (default 1)
//   limit        number (default 25, max 100)
//   export       "csv" — returns a CSV file instead of JSON

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import { SurveyType } from "@prisma/client";

// ─── Email helper ──────────────────────────────────────────────────────────────

export async function sendFeedbackNotificationEmail(survey: {
    survey_type: string;
    reference_id?: string | null;
    urgency_label?: string | null;
    category_name?: string | null;
    rating_ease_of_understanding?: number | null;
    rating_helpfulness?: number | null;
    rating_accuracy?: number | null;
    rating_urgency_clarity?: number | null;
    rating_likelihood_to_upgrade?: number | null;
    average_rating?: number | null;
    comment?: string | null;
    converted_to_paid?: boolean;
    purchase_amount_pence?: number | null;
    created_at?: Date;
}) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM ?? user;

    if (!host || !user || !pass) return;

    const emailSetting = await prisma.setting.findUnique({
        where: { key: "openai_alert_email" },
    });

    const to = emailSetting?.value as string | undefined;
    if (!to) return;

    const isFullBreakdown = survey.survey_type === "full_breakdown";
    const label = isFullBreakdown ? "Full Breakdown" : "Free Summary";
    const avg = survey.average_rating?.toFixed(1) ?? "–";
    const stars = (n?: number | null) => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "–");
    const amount = survey.purchase_amount_pence ? `£${(survey.purchase_amount_pence / 100).toFixed(2)}` : "–";

    const urgencyColor: Record<string, string> = {
        "Time-Sensitive": "#dc2626",
        Important: "#d97706",
        Routine: "#16a34a",
    };
    const urgColor = urgencyColor[survey.urgency_label ?? ""] ?? "#64748b";

    const ratingRows = [
        [isFullBreakdown ? "Clarity of breakdown" : "Ease of understanding", survey.rating_ease_of_understanding],
        [isFullBreakdown ? "Helpfulness of key points" : "Helpfulness overall", survey.rating_helpfulness],
        [isFullBreakdown ? "Value vs free summary" : "Accuracy", survey.rating_accuracy],
        [isFullBreakdown ? "Overall satisfaction" : "Urgency rating clarity", survey.rating_urgency_clarity],
        [isFullBreakdown ? "Likelihood to return" : "Likelihood to upgrade", survey.rating_likelihood_to_upgrade],
    ] as [string, number | null | undefined][];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Feedback — ${label}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1f36 0%,#0F233F 60%,#133352 100%);border-radius:20px 20px 0 0;padding:36px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;background:rgba(84,214,212,0.15);border:1px solid rgba(84,214,212,0.3);border-radius:99px;padding:4px 14px;margin-bottom:14px;">
                    <span style="font-size:11px;font-weight:800;color:#54D6D4;letter-spacing:0.1em;text-transform:uppercase;">
                      ${label} Feedback
                    </span>
                  </div>
                  <h1 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.02em;line-height:1.2;">
                    New Feedback Received
                  </h1>
                  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:500;">
                    A user just submitted a ${label.toLowerCase()} rating on Explain My Letter.
                  </p>
                </td>
                <td align="right" valign="top">
                  <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:12px 18px;text-align:center;">
                    <div style="font-size:32px;font-weight:900;color:#54D6D4;line-height:1;">${avg}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:700;margin-top:2px;">AVG RATING</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Meta strip -->
        <tr>
          <td style="background:#fff;padding:0 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #f1f5f9;padding:20px 0;">
              <tr>
                <td style="padding-right:24px;">
                  <div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Reference</div>
                  <div style="font-size:13px;font-weight:700;color:#0F233F;font-family:monospace;">${survey.reference_id ?? "–"}</div>
                </td>
                <td style="padding-right:24px;">
                  <div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Category</div>
                  <div style="font-size:13px;font-weight:700;color:#0F233F;">${survey.category_name ?? "–"}</div>
                </td>
                <td style="padding-right:24px;">
                  <div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Urgency</div>
                  <div style="font-size:13px;font-weight:800;color:${urgColor};">${survey.urgency_label ?? "–"}</div>
                </td>
                <td>
                  <div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Revenue</div>
                  <div style="font-size:13px;font-weight:700;color:${survey.converted_to_paid ? "#12A1A6" : "#94a3b8"};">${amount}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Ratings -->
        <tr>
          <td style="background:#fff;padding:24px 40px 8px;">
            <div style="font-size:11px;font-weight:800;color:#12A1A6;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
              ⭐ Ratings
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${ratingRows
                  .map(
                      ([q, r]) => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f8fafc;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#475569;font-weight:500;">${q}</td>
                      <td align="right">
                        <span style="font-size:14px;color:#f59e0b;letter-spacing:1px;">${stars(r)}</span>
                        <span style="font-size:12px;font-weight:800;color:#0F233F;margin-left:6px;">${r ?? "–"}/5</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`,
                  )
                  .join("")}
            </table>
          </td>
        </tr>

        <!-- Comment -->
        ${
            survey.comment
                ? `
        <tr>
          <td style="background:#fff;padding:20px 40px 8px;">
            <div style="font-size:11px;font-weight:800;color:#12A1A6;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;">💬 Comment</div>
            <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
              <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;font-style:italic;">"${survey.comment}"</p>
            </div>
          </td>
        </tr>`
                : ""
        }

        <!-- Footer -->
        <tr>
          <td style="background:#fff;border-radius:0 0 20px 20px;padding:24px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:500;">
                    Submitted ${survey.created_at ? new Date(survey.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "just now"} · Explain My Letter Admin
                  </p>
                </td>
                <td align="right">
                  <span style="display:inline-block;background:${survey.converted_to_paid ? "rgba(18,161,166,0.1)" : "#f1f5f9"};color:${survey.converted_to_paid ? "#12A1A6" : "#94a3b8"};font-size:11px;font-weight:800;padding:4px 12px;border-radius:99px;letter-spacing:0.06em;">
                    ${survey.converted_to_paid ? "✓ PAID USER" : "FREE USER"}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bottom gap -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">This is an automated notification from Explain My Letter.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

    await transporter.sendMail({
        from: `"Explain My Letter" <${from}>`,
        to,
        subject: `⭐ New ${label} Feedback — ${avg}/5 ${survey.comment ? "(with comment)" : ""}`,
        html,
    });
}

// ─── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    // const authError = await requireAdminAuth(req);
    // if (authError) return authError;

    try {
        const { searchParams } = new URL(req.url);
        const survey_type = searchParams.get("survey_type");
        const category_id = searchParams.get("category_id");
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
        const exportCsv = searchParams.get("export") === "csv";

        // ── Build Prisma filter ────────────────────────────────────────────────
        const where: any = {};
        if (survey_type) where.survey_type = survey_type as SurveyType;
        if (category_id) where.category_id = category_id;

        if (from || to) {
            where.created_at = {};
            if (from) where.created_at.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                where.created_at.lte = toDate;
            }
        }

        // ── CSV export ─────────────────────────────────────────────────────────
        if (exportCsv) {
            const all = await prisma.feedbackSurvey.findMany({
                where,
                orderBy: { created_at: "desc" },
            });

            const headers = [
                "survey_type",
                "reference_id",
                "category_name",
                "urgency_label",
                "q1_ease",
                "q2_helpfulness",
                "q3_accuracy",
                "q4_urgency_clarity",
                "q5_likelihood",
                "average_rating",
                "comment",
                "converted_to_paid",
                "purchase_amount_gbp",
                "created_at",
            ];

            const escape = (v: unknown) => {
                const s = v === null || v === undefined ? "" : String(v);
                return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
            };

            const rows = all.map((s) =>
                [
                    s.survey_type,
                    s.reference_id,
                    s.category_name,
                    s.urgency_label,
                    s.rating_ease_of_understanding,
                    s.rating_helpfulness,
                    s.rating_accuracy,
                    s.rating_urgency_clarity,
                    s.rating_likelihood_to_upgrade,
                    s.average_rating,
                    s.comment,
                    s.converted_to_paid ? "true" : "false",
                    s.purchase_amount_pence ? (s.purchase_amount_pence / 100).toFixed(2) : "",
                    s.created_at ? s.created_at.toISOString() : "",
                ]
                    .map(escape)
                    .join(","),
            );

            const csv = [headers.join(","), ...rows].join("\n");

            return new NextResponse(csv, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="feedback-${Date.now()}.csv"`,
                },
            });
        }

       // ── JSON paginated response (run in parallel via $transaction) ─────────
        const [total, surveys] = await prisma.$transaction([
            prisma.feedbackSurvey.count({ where }),
            prisma.feedbackSurvey.findMany({
                where,
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        // MAPPING FIX: Append _id so frontend admin tables don't break
        const mappedSurveys = surveys.map((survey) => ({
            ...survey,
            _id: survey.id
        }));

        return NextResponse.json({
            surveys: mappedSurveys,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("[GET /api/admin/feedback]", err);
        return NextResponse.json({ error: "Failed to fetch feedback." }, { status: 500 });
    }
}