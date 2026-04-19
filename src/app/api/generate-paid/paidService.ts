// src/app/api/generate-paid/paidService.ts
//
// CRITICAL: This service must ONLY be called by the internal Stripe webhook handler
// or the verify-payment fallback. Never call directly from client-side code (§7.2).

import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { JobState, PromptType, UrgencyLabel } from "@prisma/client";
import { checkAndIncrementMonthlyUsage } from "@/lib/tokenBudget";
import { maybeSendCapAlert } from "@/lib/sendCapAlert";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_WORD_HARD_CAP = 1200;
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [0, 2000, 5000];
const DEFAULT_MAX_OUTPUT_TOKENS = 2000;
const DEFAULT_MODEL = "gpt-4o";
const COST_PER_1M_INPUT = 2.0;
const COST_PER_1M_OUTPUT = 8.0;

const MANDATORY_PAID_RULES = `

---
MANDATORY SYSTEM INSTRUCTIONS (These override any previous instructions):
1. Do NOT provide legal, financial, or professional advice under any circumstances.
2. You MUST format your response using Proper Markdown (e.g., bolding, bullet points, headers) for readability.
3. You MUST end your response on a new, separate line with EXACTLY this format: URGENCY: [Level]
4. The [Level] MUST be exactly one of these three words: Routine, Important, or Time-Sensitive.
5. Do NOT use any Markdown, colours, HTML, or extra text for the final urgency label. The URGENCY line MUST be plain text and MUST be the absolute last line of your response with no additional text or whitespace after it.
6. THE BREAKDOWN MUST BE IN ENGLISH, regardless of the input language of the document. You MUST produce the breakdown in English.

URGENCY CLASSIFICATION RULES:
Determine the urgency level based on the specific instructions provided by the user earlier in this prompt. 
If, and ONLY if, no specific timeframes or conditions were provided above, use these default rules:
- Time-Sensitive: Use this if there is ANY specific deadline, due date, or court date mentioned in the text.
- Important: Use this if there are no strict deadlines, but the issue significantly affects important aspects of the recipient's life, career, finances, or legal standing.
- Routine: Use this for all other general or informational correspondence.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateToWordCap(text: string, cap: number): string {
    const words = text.trim().split(/\s+/);
    return words.length <= cap ? text : words.slice(0, cap).join(" ");
}

function estimateCost(tokensIn: number, tokensOut: number): number {
    return (tokensIn / 1_000_000) * COST_PER_1M_INPUT + (tokensOut / 1_000_000) * COST_PER_1M_OUTPUT;
}

function validateOutput(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    if (text.includes("\uFFFD")) return false;
    return text.trim().length > 50;
}

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── DB Prompt Lookup (§10.2) ─────────────────────────────────────────────────

async function resolvePromptTemplate(
    categoryId: string | null,
    categoryName: string,
    documentText: string,
    urgency: string,
    upsellInstructions: string,
): Promise<string> {
    let dbPromptText: string | null = null;

    try {
        if (categoryId) {
            const categoryPrompt = await prisma.prompt.findFirst({
                where: { category_id: categoryId, type: PromptType.paid, is_active: true },
                orderBy: { version: "desc" },
                select: { prompt_text: true },
            });
            if (categoryPrompt?.prompt_text) dbPromptText = categoryPrompt.prompt_text;
        }

        if (!dbPromptText) {
            const genericPrompt = await prisma.prompt.findFirst({
                where: { category_id: null, type: PromptType.paid, is_active: true },
                orderBy: { version: "desc" },
                select: { prompt_text: true },
            });
            if (genericPrompt?.prompt_text) dbPromptText = genericPrompt.prompt_text;
        }
    } catch (err) {
        console.warn("[generate-paid] Failed to load prompt from DB, using fallback:", err);
    }

    if (dbPromptText) {
        const hydrated = hydratePlaceholders(dbPromptText, {
            categoryName,
            documentText,
            urgency,
            upsellInstructions,
        });
        return hydrated + MANDATORY_PAID_RULES;
    }

    return buildFallbackPrompt(categoryName, documentText, upsellInstructions);
}

function hydratePlaceholders(
    template: string,
    vars: { categoryName: string; documentText: string; urgency: string; upsellInstructions: string },
): string {
    return (
        template
            .replace(/\{\{document_text\}\}/g, vars.documentText)
            .replace(/\{\{category\}\}/g, vars.categoryName)
            .replace(/\{\{urgency\}\}/g, vars.urgency) +
        (vars.upsellInstructions ? `\n\n${vars.upsellInstructions}` : "")
    );
}

function buildFallbackPrompt(
    categoryName: string,
    documentText: string,
    upsellInstructions: string,
): string {
    return `You are an expert document analyst. Produce a detailed section-by-section breakdown of the following ${categoryName} letter.

Structure your breakdown as follows:
1. **Overview** — What this letter is about (2-3 sentences)
2. **Key Points** — Bullet list of the main points
3. **Required Actions** — What the recipient MUST do (numbered list)
4. **Key Deadlines** — Any dates or timeframes mentioned
5. **Plain-English Explanation** — Explanation of any legal/technical clauses
6. **Next Steps** — Recommended course of action
${upsellInstructions}

Rules:
- Format the breakdown using Proper Markdown.
- Use plain English vocabulary throughout.
- Highlight deadlines and required actions prominently.
- Be specific and actionable.

Document text:
${documentText}
${MANDATORY_PAID_RULES}`;
}

// ─── Upsell instruction builder ───────────────────────────────────────────────

function buildUpsellInstructions(upsells: string[]): string {
    if (!upsells || upsells.length === 0) return "";
    const instructions: string[] = [];
    if (upsells.some((u) => u.toLowerCase().includes("legal"))) {
        instructions.push(
            "7. **Legal Formatting** — Format key legal clauses in a structured legal style with clear clause references.",
        );
    }
    if (upsells.some((u) => u.toLowerCase().includes("tone"))) {
        instructions.push(
            "8. **Tone Rewrite** — Provide a suggested reply or response in a professional, clear tone.",
        );
    }
    if (upsells.some((u) => u.toLowerCase().includes("detail"))) {
        instructions.push(
            "9. **Extended Detail** — Expand on each section with additional context and explanations.",
        );
    }
    return instructions.join("\n");
}

// ─── Main exported function (called by paymentService) ────────────────────────

export async function generatePaidBreakdown(
    jobId: string,
    extractedText: string,
    upsells: string[] = [],
): Promise<{ detailedBreakdown: string }> {
    // ── 1. Re-validate job state (payment lock, §7.2) ──
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { category: true },
    });
    if (!job) throw new Error("Job not found.");
    if (job.status !== JobState.PAYMENT_CONFIRMED) {
        throw new Error(
            `Cannot generate paid breakdown — job in unexpected state: ${job.status}`,
        );
    }

    // ── 2. Check global monthly token cap (§9.2) ──
    const preCheck = await checkAndIncrementMonthlyUsage(0);
    if (!preCheck.allowed) {
        throw new Error("Monthly token cap reached. Paid generation paused.");
    }

    // ── 3. Fetch configurable settings ──
    const [maxOutputSetting, wordCapSetting, modelSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "ai_max_output_tokens_paid" } }),
        prisma.setting.findUnique({ where: { key: "ai_input_word_cap" } }),
        prisma.setting.findUnique({ where: { key: "openai_model" } }),
    ]);

    const maxOutputTokens: number = (maxOutputSetting?.value as number | null) ?? DEFAULT_MAX_OUTPUT_TOKENS;
    const wordCap: number = (wordCapSetting?.value as number | null) ?? INPUT_WORD_HARD_CAP;
    const model: string = (modelSetting?.value as string | null) ?? DEFAULT_MODEL;

    // ── 4. Enforce word cap on input (§9.1) ──
    const truncatedText = truncateToWordCap(extractedText, wordCap);

    // ── 5. Resolve prompt ──
    const categoryId = job.category_id ?? null;
    const categoryName = job.category?.name ?? "General";
    let urgency: string = job.urgency ?? "Routine";

    const upsellInstructions = buildUpsellInstructions(upsells);
    const prompt = await resolvePromptTemplate(
        categoryId,
        categoryName,
        truncatedText,
        urgency,
        upsellInstructions,
    );

    // ── 6. Transition to PAID_BREAKDOWN_GENERATING ──
    await prisma.job.update({
        where: { id: jobId },
        data: {
            status: JobState.PAID_BREAKDOWN_GENERATING,
            previous_state: JobState.PAYMENT_CONFIRMED,
            state_transitioned_at: new Date(),
        },
    });

    // ── 7. Retry loop (§8.1) ──
    let lastError: Error | null = null;
    let detailedBreakdown = "";
    let tokensIn = 0;
    let tokensOut = 0;
    let attemptNumber = 1;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            await sleep(BACKOFF_DELAYS[attempt]);
            attemptNumber++;
        }

        try {
            const completion = await openai.chat.completions.create({
                model,
                max_tokens: maxOutputTokens,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.0,
            });

            const rawOutput = completion.choices[0]?.message?.content ?? "";
            tokensIn = completion.usage?.prompt_tokens ?? 0;
            tokensOut = completion.usage?.completion_tokens ?? 0;

            const urgencyMatch = rawOutput.match(/URGENCY:\s*(Routine|Important|Time-Sensitive)/i);
            if (urgencyMatch) urgency = urgencyMatch[1];

            const cleanedBreakdown = rawOutput
                .replace(/URGENCY:\s*(Routine|Important|Time-Sensitive)/i, "")
                .trim();

            if (!validateOutput(cleanedBreakdown)) {
                throw new Error(`Output validation failed on attempt ${attempt + 1}`);
            }

            detailedBreakdown = cleanedBreakdown;
            lastError = null;
            break;
        } catch (err: any) {
            lastError = err;
            if (err?.status === 429) {
                const retryAfter = parseInt(err?.headers?.["retry-after"] ?? "5") * 1000;
                await sleep(retryAfter);
            }
            console.error(`[generate-paid] Attempt ${attempt + 1} failed:`, err.message);
        }
    }

    // ── 8. Log token usage ──
    if (tokensIn > 0 || tokensOut > 0) {
        await prisma.jobToken.create({
            data: {
                job_id: jobId,
                prompt_type: PromptType.paid,
                tokens_in: tokensIn,
                tokens_out: tokensOut,
                cost_estimate: estimateCost(tokensIn, tokensOut),
                ai_model: model,
                attempt_number: attemptNumber,
            },
        });

        // ── 9. Increment monthly usage & check threshold for alert ──
        const usageResult = await checkAndIncrementMonthlyUsage(tokensIn + tokensOut);
        if (usageResult.aboveThreshold) {
            maybeSendCapAlert({
                usedTokens: usageResult.currentUsage,
                capTokens: usageResult.cap,
                percentUsed: usageResult.percentUsed,
                promptType: "paid",
            }).catch((err) => console.error("[generate-paid] Cap alert email error:", err));
        }
    }

    // ── 10. Handle failure ──
    if (lastError) {
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: JobState.FAILED,
                previous_state: JobState.PAID_BREAKDOWN_GENERATING,
                state_transitioned_at: new Date(),
            },
        });
        throw lastError;
    }

    // ── 11. Transition to COMPLETED & store breakdown in Temp ──
    // Map the plain string urgency back to the Prisma UrgencyLabel enum.
    // The regex guarantees only these three values can be set.
    const urgencyLabelMap: Record<string, UrgencyLabel> = {
        Routine: UrgencyLabel.Routine,
        Important: UrgencyLabel.Important,
        "Time-Sensitive": UrgencyLabel.Time_Sensitive,
    };
    const urgencyLabel: UrgencyLabel = urgencyLabelMap[urgency] ?? UrgencyLabel.Routine;

    await Promise.all([
        prisma.job.update({
            where: { id: jobId },
            data: {
                status: JobState.COMPLETED,
                previous_state: JobState.PAID_BREAKDOWN_GENERATING,
                state_transitioned_at: new Date(),
                processed_at: new Date(),
                urgency: urgencyLabel,
            },
        }),
        prisma.temp.upsert({
            where: { job_id: jobId },
            update: { extracted_text: detailedBreakdown },
            create: { job_id: jobId, extracted_text: detailedBreakdown },
        }),
    ]);

    return { detailedBreakdown };
}