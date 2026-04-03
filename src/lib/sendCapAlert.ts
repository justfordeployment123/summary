// src/lib/sendCapAlert.ts
//
// Sends an alert email whenever OpenAI monthly usage is at or above the configured
// threshold percent. Designed to be called on EVERY request while above threshold —
// not just on first crossing — so admins are notified continuously until they act.
//
// Reads recipient address from DB setting key: "openai_alert_email".
// Sends via Nodemailer over SMTP — requires these env vars:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM (optional)
//
// Fails silently — never throws — so it can never break the main generation flow.

import nodemailer from "nodemailer";
import { Setting } from "@/models/Setting";

export interface CapAlertOptions {
    usedTokens: number;
    capTokens: number;
    percentUsed: number;
    promptType: "free" | "paid";
}

/**
 * Reads the alert email from DB then sends a usage alert.
 * Returns immediately (no-op) if:
 *   - No email is configured in DB
 *   - SMTP env vars are missing
 * Never throws — all errors are caught and logged.
 */
export async function maybeSendCapAlert(opts: CapAlertOptions): Promise<void> {
    try {
        const emailSetting = await Setting.findOne({ key: "openai_alert_email" }).lean<{ value: string }>();
        const alertEmail = emailSetting?.value?.trim() ?? "";

        if (!alertEmail) return;

        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT ?? 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM ?? user;

        if (!host || !user || !pass) {
            console.warn("[sendCapAlert] SMTP env vars not configured — skipping alert email.");
            return;
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });

        const percentRounded = opts.percentUsed.toFixed(1);
        const usedFormatted = opts.usedTokens.toLocaleString();
        const capFormatted = opts.capTokens.toLocaleString();
        const remaining = Math.max(0, opts.capTokens - opts.usedTokens).toLocaleString();
        const triggeredBy = opts.promptType === "free" ? "Free Summary" : "Paid Breakdown";
        const isCapReached = opts.usedTokens >= opts.capTokens;

        const subjectPrefix = isCapReached ? "🚨 Monthly Cap REACHED" : `⚠️ Usage Alert — ${percentRounded}%`;

        await transporter.sendMail({
            from: `"LetterDecoder Admin" <${from}>`,
            to: alertEmail,
            subject: `${subjectPrefix} of OpenAI Monthly Cap`,
            html: `
                <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1e293b;">

                    <div style="background:${isCapReached ? "#fef2f2" : "#fffbeb"};border-left:4px solid ${isCapReached ? "#dc2626" : "#f59e0b"};padding:16px 20px;border-radius:8px;margin-bottom:24px;">
                        <h2 style="margin:0 0 4px;font-size:18px;color:${isCapReached ? "#dc2626" : "#b45309"};">
                            ${isCapReached ? "🚨 Monthly Token Cap Reached" : "⚠️ OpenAI Monthly Usage Alert"}
                        </h2>
                        <p style="margin:0;font-size:13px;color:#64748b;">
                            Triggered by a <strong>${triggeredBy}</strong> request
                            ${isCapReached ? "— <strong>AI generation is now paused</strong>" : ""}
                        </p>
                    </div>

                    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
                        <tr style="background:#f8fafc;">
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;width:50%;">Tokens Used</td>
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-family:monospace;">${usedFormatted}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Monthly Cap</td>
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-family:monospace;">${capFormatted}</td>
                        </tr>
                        <tr style="background:${isCapReached ? "#fef2f2" : "#fffbeb"};">
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;color:${isCapReached ? "#dc2626" : "#b45309"};">Usage</td>
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:${isCapReached ? "#dc2626" : "#b45309"};">${percentRounded}%</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Tokens Remaining</td>
                            <td style="padding:10px 14px;border:1px solid #e2e8f0;font-family:monospace;">${remaining}</td>
                        </tr>
                    </table>

                    <p style="font-size:13px;color:#64748b;line-height:1.6;">
                        ${
                            isCapReached
                                ? "The monthly cap has been reached. All AI generation is paused until the cap is raised or the month resets. Update the cap in <strong>Admin → Settings → OpenAI / AI</strong>."
                                : "This alert fires on <strong>every request</strong> while usage remains at or above the configured threshold. To adjust the threshold or alert email, go to <strong>Admin → Settings → OpenAI / AI</strong>."
                        }
                    </p>

                </div>
            `,
        });

        console.log(`[sendCapAlert] Alert sent to ${alertEmail} — ${percentRounded}% used (${triggeredBy})`);
    } catch (err) {
        // Never let email errors bubble up and break generation
        console.error("[sendCapAlert] Failed to send alert email:", err);
    }
}
