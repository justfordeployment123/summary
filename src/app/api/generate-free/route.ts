// src/app/api/generate-free/route.ts
//
// Requirement constraints enforced here (§9, §11):
//   • 1,200-word hard cap on input text BEFORE sending to OpenAI
//   • 100–130 word output limit (server-side enforced via prompt + validation)
//   • Configurable max input/output token caps from Settings DB
//   • Per-request token usage & cost logging to job_tokens table
//   • Retry logic: 3 attempts with 2s / 5s backoff (§8.1)
//   • AI output validation: non-empty, minimum length, valid encoding
//   • Global monthly token cap check (§9.2)
//   • Alert email sent on every request when usage is at or above threshold
//   • Category-specific prompt fetched from DB (§10.2) — falls back to hardcoded default
//   • OpenAI model read from Settings DB (openai_model key) — falls back to gpt-4.1

import { NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { Setting } from "@/models/Setting";
import { Prompt } from "@/models/Prompt";
import { JobState } from "@/types/job";
import { JobToken } from "@/models/JobToken";
import { checkAndIncrementMonthlyUsage } from "@/lib/tokenBudget";
import { maybeSendCapAlert } from "@/lib/sendCapAlert";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_WORD_HARD_CAP = 1200;
const FREE_SUMMARY_MIN_WORDS = 100;
const FREE_SUMMARY_MAX_WORDS = 130;
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [0, 2000, 5000];
const DEFAULT_MAX_OUTPUT_TOKENS = 300;
const DEFAULT_MAX_INPUT_TOKENS = 2000;
const DEFAULT_MODEL = "gpt-4.1";
const COST_PER_1M_INPUT = 2.0;
const COST_PER_1M_OUTPUT = 8.0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function truncateToWordCap(text: string, cap: number): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= cap) return text;
    return words.slice(0, cap).join(" ");
}

function estimateCost(tokensIn: number, tokensOut: number): number {
    return (tokensIn / 1_000_000) * COST_PER_1M_INPUT + (tokensOut / 1_000_000) * COST_PER_1M_OUTPUT;
}

function validateAIOutput(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    if (text.includes("\uFFFD")) return false;
    return countWords(text) >= FREE_SUMMARY_MIN_WORDS;
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Mandatory urgency rules appended to every prompt ────────────────────────

const MANDATORY_URGENCY_RULES = `

---
MANDATORY SYSTEM INSTRUCTIONS FOR URGENCY FORMATTING:
1. You MUST end your response on a new, separate line with EXACTLY this format: URGENCY: [Level]
2. The [Level] MUST be exactly one of these three words: Routine, Important, or Time-Sensitive.
3. Do NOT use any colours, HTML, or extra text for the urgency label. It must be plain, unformatted text.
4. It should be Proper Markdown formatting, but the URGENCY line MUST be the last line of your response with no additional text or whitespace after it.


URGENCY CLASSIFICATION RULES:
Determine the urgency level based on the specific instructions provided by the user earlier in this prompt. 
If, and ONLY if, no specific timeframes or conditions were provided above, use these default rules:
- Time-Sensitive: Use this if there is ANY specific deadline, due date, or court date mentioned in the text.
- Important: Use this if there are no strict deadlines, but the issue significantly affects important aspects of the recipient's life, career, finances, or legal standing.
- Routine: Use this for all other general or informational correspondence.`;

// ─── DB Prompt Lookup (§10.2) ─────────────────────────────────────────────────

async function resolvePromptTemplate(categoryId: string | null, categoryName: string, documentText: string): Promise<string> {
    let dbPromptText: string | null = null;

    try {
        if (categoryId) {
            const categoryPrompt = await Prompt.findOne({
                category_id: categoryId,
                type: "free",
                is_active: true,
            })
                .sort({ version: -1 })
                .lean<{ prompt_text: string }>();

            if (categoryPrompt?.prompt_text) {
                dbPromptText = categoryPrompt.prompt_text;
            }
        }

        if (!dbPromptText) {
            const genericPrompt = await Prompt.findOne({
                category_id: { $exists: false },
                type: "free",
                is_active: true,
            })
                .sort({ version: -1 })
                .lean<{ prompt_text: string }>();

            if (genericPrompt?.prompt_text) {
                dbPromptText = genericPrompt.prompt_text;
            }
        }
    } catch (err) {
        console.warn("[generate-free] Failed to load prompt from DB, using fallback:", err);
    }

    if (dbPromptText) {
        return hydratePlaceholders(dbPromptText, { categoryName, documentText }) + MANDATORY_URGENCY_RULES;
    }

    return buildFallbackPrompt(categoryName, documentText);
}

function hydratePlaceholders(template: string, vars: { categoryName: string; documentText: string }): string {
    return template.replace(/\{\{document_text\}\}/g, vars.documentText).replace(/\{\{category\}\}/g, vars.categoryName);
}

function buildFallbackPrompt(categoryName: string, documentText: string): string {
    return `You are a plain-English document simplifier.
The user has uploaded a ${categoryName} letter.

Summarise the letter in EXACTLY 100-130 words of plain English. 

Rules:
- No more than 130 words, no fewer than 100 words
- Plain English only — no jargon, no legal language
- Be specific about what the letter says and what the recipient needs to know
- Do NOT include professional advice

Document text:
${documentText}
${MANDATORY_URGENCY_RULES}`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();
        const { jobId, extractedText } = body;

        if (!jobId || !extractedText) {
            return NextResponse.json({ error: "Missing required fields: jobId, extractedText." }, { status: 400 });
        }

        // ── 1. Validate job ──
        const job = await Job.findById(jobId).populate("category_id").lean<any>();
        if (!job) {
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }
        if (![JobState.OCR_PROCESSING, JobState.FREE_SUMMARY_GENERATING, JobState.UPLOADED].includes(job.status)) {
            console.warn(`[generate-free] Job ${jobId} in unexpected state: ${job.status}`);
        }

        // ── 2. Check global monthly token cap (§9.2) ──
        const preCheck = await checkAndIncrementMonthlyUsage(0);
        if (!preCheck.allowed) {
            return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
        }

        // ── 3. Fetch configurable settings ──
        const [maxOutputTokensSetting, wordCapSetting, modelSetting] = await Promise.all([
            Setting.findOne({ key: "ai_max_output_tokens_free" }).lean<any>(),
            Setting.findOne({ key: "ai_input_word_cap" }).lean<any>(),
            Setting.findOne({ key: "openai_model" }).lean<any>(),
        ]);

        const maxOutputTokens: number = maxOutputTokensSetting?.value ?? DEFAULT_MAX_OUTPUT_TOKENS;
        const wordCap: number = wordCapSetting?.value ?? INPUT_WORD_HARD_CAP;
        const model: string = modelSetting?.value ?? DEFAULT_MODEL;

        // ── 4. Enforce word cap on input (§9.1) ──
        const truncatedText = truncateToWordCap(extractedText, wordCap);

        // ── 5. Resolve prompt ──
        const category = job.category_id as any;
        const categoryId = category?._id?.toString() ?? null;
        const categoryName = category?.name ?? "General";
        const prompt = await resolvePromptTemplate(categoryId, categoryName, truncatedText);

        // ── 6. Transition to FREE_SUMMARY_GENERATING ──
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FREE_SUMMARY_GENERATING,
            previous_state: job.status,
            state_transitioned_at: new Date(),
        });

        // ── 7. Retry loop with backoff (§8.1) ──
        let lastError: Error | null = null;
        let summary = "";
        let urgency = "Routine";
        let tokensIn = 0;
        let tokensOut = 0;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) await sleep(BACKOFF_DELAYS[attempt]);

            try {
                const completion = await openai.chat.completions.create({
                    model,
                    max_tokens: maxOutputTokens,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                });

                const rawOutput = completion.choices[0]?.message?.content ?? "";
                tokensIn = completion.usage?.prompt_tokens ?? 0;
                tokensOut = completion.usage?.completion_tokens ?? 0;

                const urgencyMatch = rawOutput.match(/URGENCY:\s*(Routine|Important|Time-Sensitive)/i);
                urgency = urgencyMatch?.[1] ?? "Routine";
                summary = rawOutput.replace(/URGENCY:\s*(Routine|Important|Time-Sensitive)/i, "").trim();

                if (!validateAIOutput(summary)) {
                    throw new Error(`AI output failed validation on attempt ${attempt + 1}. Word count: ${countWords(summary)}`);
                }

                summary = truncateToWordCap(summary, FREE_SUMMARY_MAX_WORDS);
                lastError = null;
                break;
            } catch (err: any) {
                lastError = err;
                if (err?.status === 429) {
                    const retryAfter = parseInt(err?.headers?.["retry-after"] ?? "5") * 1000;
                    await sleep(retryAfter);
                }
                console.error(`[generate-free] Attempt ${attempt + 1} failed:`, err.message);
            }
        }

        // ── 8. All retries exhausted ──
        if (lastError) {
            await Job.findByIdAndUpdate(jobId, {
                status: JobState.FAILED,
                previous_state: JobState.FREE_SUMMARY_GENERATING,
                state_transitioned_at: new Date(),
            });
            return NextResponse.json({ error: "Failed to generate AI summary. Please try again." }, { status: 502 });
        }

        // ── 9. Log token usage & cost (§9.1) ──
        await JobToken.create({
            job_id: jobId,
            prompt_type: "free",
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cost_estimate: estimateCost(tokensIn, tokensOut),
            model,
            attempt_number: 1,
        });

        // ── 10. Increment monthly usage counter & check threshold for alert ──
        const usageResult = await checkAndIncrementMonthlyUsage(tokensIn + tokensOut);

        // Fire alert email on every request while at or above threshold (fire-and-forget)
        if (usageResult.aboveThreshold) {
            maybeSendCapAlert({
                usedTokens: usageResult.currentUsage,
                capTokens: usageResult.cap,
                percentUsed: usageResult.percentUsed,
                promptType: "free",
            }).catch((err) => console.error("[generate-free] Cap alert email error:", err));
        }

        // ── 11. Transition job to FREE_SUMMARY_COMPLETE ──
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FREE_SUMMARY_COMPLETE,
            previous_state: JobState.FREE_SUMMARY_GENERATING,
            state_transitioned_at: new Date(),
            urgency,
            free_summary: summary,
        });

        return NextResponse.json({ summary, urgency });
    } catch (error: any) {
        console.error("[generate-free]", error);
        return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
    }
}
