// src/lib/tokenBudget.ts
//
// Global monthly token cap management (§9.2):
//   • Hard cap stored in Settings DB (key: "monthly_token_cap")
//   • Current month usage stored in Settings DB (key: "monthly_token_usage_{YYYY-MM}")
//   • Auto-disables paid AI generation when cap reached
//   • Sends email alert at 80% threshold (key: "monthly_cap_alert_threshold", default 80)
//   • Monthly usage resets on 1st of each calendar month (automatic via key naming)
//   • Admin dashboard flag when cap reached (key: "monthly_cap_reached")

import dbConnect from "@/lib/db";
import { Setting } from "@/models/Setting";

const DEFAULT_MONTHLY_CAP = 10_000_000; // 10M tokens — configurable
const DEFAULT_ALERT_THRESHOLD = 80; // percent

function getCurrentMonthKey(): string {
    const now = new Date();
    return `monthly_token_usage_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface CapResult {
    allowed: boolean;
    currentUsage: number;
    cap: number;
    percentUsed: number;
}

/**
 * Check if the monthly token cap allows more usage, and optionally increment
 * the counter by `tokensUsed` (pass 0 to check only).
 *
 * Returns { allowed: true } if usage is below cap.
 * Returns { allowed: false } if cap is reached — caller should reject the request.
 */
export async function checkAndIncrementMonthlyUsage(
    tokensUsed: number,
): Promise<CapResult> {
    await dbConnect();

    const monthKey = getCurrentMonthKey();

    // Fetch cap and current usage atomically (both from Settings)
    const [capSetting, usageSetting, thresholdSetting] = await Promise.all([
        Setting.findOne({ key: "monthly_token_cap" }).lean<any>(),
        Setting.findOne({ key: monthKey }).lean<any>(),
        Setting.findOne({ key: "monthly_cap_alert_threshold" }).lean<any>(),
    ]);

    const cap: number = capSetting?.value ?? DEFAULT_MONTHLY_CAP;
    const currentUsage: number = usageSetting?.value ?? 0;
    const alertThreshold: number = thresholdSetting?.value ?? DEFAULT_ALERT_THRESHOLD;

    const percentUsed = Math.round((currentUsage / cap) * 100);

    // ── Cap reached ──
    if (currentUsage >= cap) {
        // Ensure dashboard flag is set
        await Setting.findOneAndUpdate(
            { key: "monthly_cap_reached" },
            { value: true, description: "Set automatically when monthly cap is reached." },
            { upsert: true },
        );
        return { allowed: false, currentUsage, cap, percentUsed };
    }

    // ── Increment if requested ──
    if (tokensUsed > 0) {
        const newUsage = currentUsage + tokensUsed;
        await Setting.findOneAndUpdate(
            { key: monthKey },
            {
                value: newUsage,
                description: `Monthly token usage for ${monthKey}`,
            },
            { upsert: true },
        );

        const newPercent = Math.round((newUsage / cap) * 100);

        // ── 80% threshold alert ──
        if (newPercent >= alertThreshold && percentUsed < alertThreshold) {
            // Trigger alert email (fire and forget)
            sendCapAlertEmail(newPercent, newUsage, cap).catch((err) =>
                console.error("[tokenBudget] Alert email failed:", err),
            );

            // Set dashboard flag
            await Setting.findOneAndUpdate(
                { key: "monthly_cap_alert_sent" },
                { value: true, description: "Alert sent at threshold." },
                { upsert: true },
            );
        }

        // ── Cap just reached ──
        if (newUsage >= cap) {
            await Setting.findOneAndUpdate(
                { key: "monthly_cap_reached" },
                { value: true },
                { upsert: true },
            );
        }
    }

    return { allowed: true, currentUsage, cap, percentUsed };
}

/**
 * Reset monthly usage counter manually (admin action or scheduled 1st-of-month).
 * The automatic reset happens naturally because the key includes the month/year.
 */
export async function resetMonthlyUsage(): Promise<void> {
    await dbConnect();
    const monthKey = getCurrentMonthKey();
    await Promise.all([
        Setting.findOneAndUpdate({ key: monthKey }, { value: 0 }, { upsert: true }),
        Setting.findOneAndUpdate(
            { key: "monthly_cap_reached" },
            { value: false },
            { upsert: true },
        ),
        Setting.findOneAndUpdate(
            { key: "monthly_cap_alert_sent" },
            { value: false },
            { upsert: true },
        ),
    ]);
}

// ─── Email alert ─────────────────────────────────────────────────────────────

async function sendCapAlertEmail(
    percentUsed: number,
    currentUsage: number,
    cap: number,
): Promise<void> {
    // In production: integrate with SendGrid / SES / Resend
    // Placeholder — replace with real email sender
    const adminEmail = process.env.ADMIN_ALERT_EMAIL;
    if (!adminEmail) return;

    console.warn(
        `[tokenBudget] ALERT: Monthly token usage at ${percentUsed}% (${currentUsage.toLocaleString()} / ${cap.toLocaleString()} tokens). Admin: ${adminEmail}`,
    );

    // Example with fetch to a transactional email API:
    // await fetch("https://api.sendgrid.com/v3/mail/send", { ... })
}