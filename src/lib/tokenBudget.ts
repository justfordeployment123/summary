// src/lib/tokenBudget.ts
//
// Global monthly token cap management (§9.2):
//   • Hard cap stored in Settings DB (key: "openai_monthly_token_cap")
//   • Current month usage stored in Settings DB (key: "monthly_token_usage_{YYYY-MM}")
//   • Auto-disables paid AI generation when cap reached
//   • Sends email alert at configured threshold % — fires on EVERY request while above threshold
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

export interface CapResult {
    allowed: boolean;
    currentUsage: number;
    cap: number;
    percentUsed: number;
    /**
     * True when usage is at or above the alert threshold AFTER this increment.
     * Callers should call maybeSendCapAlert() whenever this is true — it fires
     * on every request above threshold, not just the first crossing.
     */
    aboveThreshold: boolean;
}

/**
 * Check if the monthly token cap allows more usage, and optionally increment
 * the counter by `tokensUsed` (pass 0 to check only).
 *
 * Returns { allowed: true }  if usage is below cap.
 * Returns { allowed: false } if cap is reached — caller should reject the request.
 */
export async function checkAndIncrementMonthlyUsage(tokensUsed: number): Promise<CapResult> {
    await dbConnect();

    const monthKey = getCurrentMonthKey();

    const [capSetting, usageSetting, thresholdSetting] = await Promise.all([
        Setting.findOne({ key: "openai_monthly_token_cap" }).lean<any>(),
        Setting.findOne({ key: monthKey }).lean<any>(),
        Setting.findOne({ key: "openai_alert_threshold_percent" }).lean<any>(),
    ]);

    const cap: number = capSetting?.value ?? DEFAULT_MONTHLY_CAP;
    const currentUsage: number = usageSetting?.value ?? 0;
    const alertThreshold: number = thresholdSetting?.value ?? DEFAULT_ALERT_THRESHOLD;

    const percentUsed = (currentUsage / cap) * 100;

    // ── Cap already reached before this request ──
    if (currentUsage >= cap) {
        await Setting.findOneAndUpdate(
            { key: "monthly_cap_reached" },
            { value: true, description: "Set automatically when monthly cap is reached." },
            { upsert: true },
        );
        return { allowed: false, currentUsage, cap, percentUsed, aboveThreshold: true };
    }

    // ── Increment if requested ──
    let newUsage = currentUsage;
    let newPercent = percentUsed;
    let aboveThreshold = percentUsed >= alertThreshold;

    if (tokensUsed > 0) {
        newUsage = currentUsage + tokensUsed;
        newPercent = (newUsage / cap) * 100;

        await Setting.findOneAndUpdate({ key: monthKey }, { value: newUsage, description: `Monthly token usage for ${monthKey}` }, { upsert: true });

        aboveThreshold = newPercent >= alertThreshold;

        // ── Cap just reached ──
        if (newUsage >= cap) {
            await Setting.findOneAndUpdate({ key: "monthly_cap_reached" }, { value: true }, { upsert: true });
        }
    }

    return {
        allowed: true,
        currentUsage: newUsage,
        cap,
        percentUsed: newPercent,
        aboveThreshold,
    };
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
        Setting.findOneAndUpdate({ key: "monthly_cap_reached" }, { value: false }, { upsert: true }),
    ]);
}
