// src/lib/sendBreakdownEmail.ts
//
// Emails the paid breakdown to the user once generation completes.
// Sends via the same SMTP transport (Titan / info@explainmyletter.co.uk) used
// for admin cap alerts — env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
//
// Fails silently — never throws — so an SMTP outage cannot mask a successful
// breakdown that the user can still see in the browser.

import nodemailer from "nodemailer";
import { markdownToHtml } from "@/lib/homeUtils";
import { generatePDF } from "@/lib/pdfGenerator";

export interface BreakdownEmailOptions {
    toEmail: string;
    userName: string;
    referenceId: string;
    categoryName: string;
    urgency: string | null;
    breakdownMarkdown: string;
    /** Defaults to today (en-GB) if omitted. */
    processedAt?: Date;
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    Routine: { bg: "#e6faf9", text: "#12A1A6", border: "#b2eeec" },
    Important: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    "Time-Sensitive": { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
};

export async function sendBreakdownEmail(opts: BreakdownEmailOptions): Promise<void> {
    try {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT ?? 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM ?? user;

        if (!host || !user || !pass) {
            console.warn("[sendBreakdownEmail] SMTP env vars not configured — skipping breakdown email.");
            return;
        }

        if (!opts.toEmail || !opts.toEmail.includes("@")) {
            console.warn("[sendBreakdownEmail] Invalid recipient — skipping.");
            return;
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });

        const breakdownHtml = markdownToHtml(opts.breakdownMarkdown);
        const urgencyKey = opts.urgency ?? "Routine";
        const urgencyStyle = URGENCY_STYLES[urgencyKey] ?? URGENCY_STYLES.Routine;
        const safeName = (opts.userName || "there").split(/\s+/)[0];

        // Build the same PDF the user would download from /api/download/pdf,
        // so the attachment matches what they get on-screen.
        const dateStr = (opts.processedAt ?? new Date()).toLocaleDateString("en-GB");
        let pdfBuffer: Buffer | null = null;
        try {
            pdfBuffer = await generatePDF(opts.breakdownMarkdown, opts.referenceId, dateStr);
        } catch (pdfErr) {
            // PDF failure must not block the email — fall back to HTML/text-only.
            console.error("[sendBreakdownEmail] PDF generation failed, sending without attachment:", pdfErr);
        }

        const safeRefForFilename = opts.referenceId.replace(/[^a-zA-Z0-9_-]/g, "_");
        const pdfFilename = `ExplainMyLetter-Breakdown-${safeRefForFilename}.pdf`;

        const html = `
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Your Letter Breakdown</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f9;padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;box-shadow:0 4px 14px rgba(15,35,63,0.06);overflow:hidden;">
                    <tr>
                        <td style="background:#0F233F;padding:28px 32px;text-align:left;">
                            <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#54D6D4;font-weight:700;">Explain My Letter</div>
                            <div style="font-size:22px;font-weight:800;color:#ffffff;margin-top:6px;">Your Detailed Breakdown is Ready</div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 32px 8px 32px;">
                            <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#1e293b;">
                                Hi ${escapeHtml(safeName)},
                            </p>
                            <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                                Thanks for using Explain My Letter. Below is the detailed breakdown of your <strong>${escapeHtml(opts.categoryName)}</strong> letter,
                                and a PDF copy is attached for your records.
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                                <tr>
                                    <td style="padding:6px 12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b;">
                                        Reference: <strong style="color:#0F233F;font-family:monospace;">${escapeHtml(opts.referenceId)}</strong>
                                    </td>
                                    <td style="width:8px;"></td>
                                    <td style="padding:6px 12px;background:${urgencyStyle.bg};border:1px solid ${urgencyStyle.border};border-radius:8px;font-size:12px;color:${urgencyStyle.text};font-weight:700;">
                                        ${escapeHtml(urgencyKey)}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:8px 24px 24px 24px;">
                            <div style="border-top:1px solid #eef2f7;padding-top:14px;">
                                ${breakdownHtml}
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 32px 28px 32px;border-top:1px solid #eef2f7;background:#fafbfc;">
                            <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748b;">
                                <strong style="color:#0F233F;">Disclaimer:</strong> This breakdown is for informational purposes only and does not constitute legal, financial, or professional advice.
                            </p>
                            <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                                Sent by Explain My Letter · <a href="https://explainmyletter.co.uk" style="color:#12A1A6;text-decoration:none;">explainmyletter.co.uk</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();

        const subject = `Your ${opts.categoryName} breakdown — Ref ${opts.referenceId}`;

        const attachments = pdfBuffer
            ? [
                  {
                      filename: pdfFilename,
                      content: pdfBuffer,
                      contentType: "application/pdf",
                  },
              ]
            : undefined;

        await transporter.sendMail({
            from,
            to: opts.toEmail,
            subject,
            html,
            text: buildPlainText(opts),
            attachments,
        });

        console.log(
            `[sendBreakdownEmail] Breakdown emailed to ${opts.toEmail} (ref ${opts.referenceId})${pdfBuffer ? " with PDF attachment" : " (no PDF — generation failed)"}`,
        );
    } catch (err) {
        console.error("[sendBreakdownEmail] Failed to send breakdown email:", err);
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildPlainText(opts: BreakdownEmailOptions): string {
    return [
        `Hi ${(opts.userName || "there").split(/\s+/)[0]},`,
        "",
        `Your detailed breakdown for your ${opts.categoryName} letter is ready.`,
        `Reference: ${opts.referenceId}`,
        `Urgency: ${opts.urgency ?? "Routine"}`,
        "",
        "----- BREAKDOWN -----",
        opts.breakdownMarkdown,
        "---------------------",
        "",
        "Disclaimer: This breakdown is for informational purposes only and does not constitute legal, financial, or professional advice.",
        "",
        "— Explain My Letter (https://explainmyletter.co.uk)",
    ].join("\n");
}
