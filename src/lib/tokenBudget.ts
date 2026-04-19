// src/lib/tokenBudget.ts
//
// Global monthly token cap management (§9.2):
//   • Hard cap stored in Settings DB (key: "openai_monthly_token_cap")
//   • Current month usage stored in Settings DB (key: "monthly_token_usage_{YYYY-MM}")
//   • Auto-disables paid AI generation when cap reached
//   • Sends email alert at configured threshold % — fires on EVERY request while above threshold
//   • Monthly usage resets on 1st of each calendar month (automatic via key naming)
//   • Admin dashboard flag when cap reached (key: "monthly_cap_reached")

import prisma from "@/lib/prisma";

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
    const monthKey = getCurrentMonthKey();

    // Fetch all three settings concurrently
    const [capSetting, usageSetting, thresholdSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "openai_monthly_token_cap" } }),
        prisma.setting.findUnique({ where: { key: monthKey } }),
        prisma.setting.findUnique({ where: { key: "openai_alert_threshold_percent" } }),
    ]);

    // Safely cast Prisma JSON values to numbers, falling back to defaults
    const cap: number = (capSetting?.value as number) ?? DEFAULT_MONTHLY_CAP;
    const currentUsage: number = (usageSetting?.value as number) ?? 0;
    const alertThreshold: number = (thresholdSetting?.value as number) ?? DEFAULT_ALERT_THRESHOLD;

    const percentUsed = (currentUsage / cap) * 100;

    // ── Cap already reached before this request ──
    if (currentUsage >= cap) {
        await prisma.setting.upsert({
            where: { key: "monthly_cap_reached" },
            update: { value: true },
            create: { 
                key: "monthly_cap_reached", 
                value: true, 
                description: "Set automatically when monthly cap is reached." 
            },
        });
        return { allowed: false, currentUsage, cap, percentUsed, aboveThreshold: true };
    }

    // ── Increment if requested ──
    let newUsage = currentUsage;
    let newPercent = percentUsed;
    let aboveThreshold = percentUsed >= alertThreshold;

    if (tokensUsed > 0) {
        newUsage = currentUsage + tokensUsed;
        newPercent = (newUsage / cap) * 100;

        await prisma.setting.upsert({
            where: { key: monthKey },
            update: { value: newUsage },
            create: { 
                key: monthKey, 
                value: newUsage, 
                description: `Monthly token usage for ${monthKey}` 
            },
        });

        aboveThreshold = newPercent >= alertThreshold;

        // ── Cap just reached ──
        if (newUsage >= cap) {
            await prisma.setting.upsert({
                where: { key: "monthly_cap_reached" },
                update: { value: true },
                create: { 
                    key: "monthly_cap_reached", 
                    value: true, 
                    description: "Set automatically when monthly cap is reached." 
                },
            });
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
    const monthKey = getCurrentMonthKey();
    
    // Execute both resets concurrently using Promise.all 
    // (We could use $transaction, but since they don't depend on each other, this is slightly faster)
    await Promise.all([
        prisma.setting.upsert({
            where: { key: monthKey },
            update: { value: 0 },
            create: { 
                key: monthKey, 
                value: 0, 
                description: `Monthly token usage for ${monthKey}` 
            },
        }),
        prisma.setting.upsert({
            where: { key: "monthly_cap_reached" },
            update: { value: false },
            create: { 
                key: "monthly_cap_reached", 
                value: false, 
                description: "Set automatically when monthly cap is reached." 
            },
        }),
    ]);
}