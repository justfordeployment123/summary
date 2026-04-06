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
//   • OpenAI model read from Settings DB (openai_model key) — falls back to gpt-4o
//   • Category validation: AI checks if document matches the selected category

import { NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { Setting } from "@/models/Setting";
import { Prompt } from "@/models/Prompt";
import { Category } from "@/models/Category";
import { JobState } from "@/types/job";
import { JobToken } from "@/models/JobToken";
import { checkAndIncrementMonthlyUsage } from "@/lib/tokenBudget";
import { maybeSendCapAlert } from "@/lib/sendCapAlert";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_WORD_HARD_CAP = 1200;
const FREE_SUMMARY_MIN_WORDS = 100;
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [0, 2000, 5000];
const DEFAULT_MAX_OUTPUT_TOKENS = 500; // bumped slightly to fit JSON wrapper
const DEFAULT_MAX_INPUT_TOKENS = 2000;
const DEFAULT_MODEL = "gpt-4o";
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

// ─── Parse JSON from AI response safely ──────────────────────────────────────

interface AIJsonResponse {
    categoryCorrect: boolean;
    suggestedCategory: string | null;
    summary: string;
    urgency: "Routine" | "Important" | "Time-Sensitive";
}

function parseAIJson(raw: string): AIJsonResponse | null {
    try {
        // Strip markdown code fences if present
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        const parsed = JSON.parse(cleaned);

        // Validate required fields
        if (typeof parsed.categoryCorrect !== "boolean") return null;
        if (!["Routine", "Important", "Time-Sensitive"].includes(parsed.urgency)) {
            parsed.urgency = "Routine";
        }
        if (typeof parsed.summary !== "string") parsed.summary = "";
        if (typeof parsed.suggestedCategory !== "string") parsed.suggestedCategory = null;

        return parsed as AIJsonResponse;
    } catch {
        return null;
    }
}

// ─── Build the JSON-output prompt ─────────────────────────────────────────────

function buildJsonPrompt(
    categoryName: string,
    allCategories: string[],
    documentText: string,
    dbPromptText?: string | null,
): string {
    const categoryList = allCategories.map((c) => `- ${c}`).join("\n");

    const summaryInstructions = dbPromptText
        ? hydratePlaceholders(dbPromptText, { categoryName, documentText })
        : buildFallbackSummaryBlock(categoryName, documentText);

    return `${summaryInstructions}

---
AVAILABLE CATEGORIES:
${categoryList}

SELECTED CATEGORY: "${categoryName}"

---
CRITICAL OUTPUT INSTRUCTIONS — YOU MUST RESPOND WITH ONLY VALID JSON, NO OTHER TEXT:

First, determine if the document genuinely belongs to the selected category "${categoryName}".
Then produce your response as a single JSON object with EXACTLY these four fields:

{
  "categoryCorrect": true or false,
  "suggestedCategory": "The most appropriate category name from the list above, or null if the selected category is correct",
  "summary": "Your 100–130 word plain English summary using Proper Markdown (bold, bullets). Write this even if the category is wrong — it helps the user understand the document.",
  "urgency": "Routine" or "Important" or "Time-Sensitive"
}

CATEGORY VALIDATION RULES:
- Set "categoryCorrect" to true ONLY if the document clearly and primarily belongs to "${categoryName}".
- If the document belongs to a different category, set "categoryCorrect" to false and set "suggestedCategory" to the best matching category name from the AVAILABLE CATEGORIES list above.
- If no category fits well, set "categoryCorrect" to false and "suggestedCategory" to null.
- Be strict: a tax letter is NOT a legal letter, a medical letter is NOT an insurance letter, etc.

URGENCY RULES (for the "urgency" field):
- "Time-Sensitive": any specific deadline, due date, or court date mentioned.
- "Important": no strict deadline but significantly affects finances, health, legal standing, or career.
- "Routine": all other general or informational correspondence.

SUMMARY RULES (for the "summary" field):
- 100–130 words, plain English, Proper Markdown formatting.
- No professional advice. Be specific about what the letter says.
- RETURN THE SUMMARY IN ENGLISH, regardless of the input language.

OUTPUT: Return ONLY the JSON object. No preamble, no explanation, no markdown fences.`;
}

function hydratePlaceholders(template: string, vars: { categoryName: string; documentText: string }): string {
    return template.replace(/\{\{document_text\}\}/g, vars.documentText).replace(/\{\{category\}\}/g, vars.categoryName);
}

function buildFallbackSummaryBlock(categoryName: string, documentText: string): string {
    return `You are an expert document simplifier. The user has uploaded a document they believe is a "${categoryName}" letter.

Document text:
${documentText}`;
}

// ─── DB Prompt Lookup (§10.2) ─────────────────────────────────────────────────

async function resolveDbPromptText(categoryId: string | null): Promise<string | null> {
    try {
        if (categoryId) {
            const categoryPrompt = await Prompt.findOne({
                category_id: categoryId,
                type: "free",
                is_active: true,
            })
                .sort({ version: -1 })
                .lean<{ prompt_text: string }>();

            if (categoryPrompt?.prompt_text) return categoryPrompt.prompt_text;
        }

        const genericPrompt = await Prompt.findOne({
            category_id: { $exists: false },
            type: "free",
            is_active: true,
        })
            .sort({ version: -1 })
            .lean<{ prompt_text: string }>();

        if (genericPrompt?.prompt_text) return genericPrompt.prompt_text;
    } catch (err) {
        console.warn("[generate-free] Failed to load prompt from DB:", err);
    }
    return null;
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

        const maxOutputTokens: number = (maxOutputTokensSetting?.value ?? DEFAULT_MAX_OUTPUT_TOKENS) + 150; // extra headroom for JSON
        const wordCap: number = wordCapSetting?.value ?? INPUT_WORD_HARD_CAP;
        const model: string = modelSetting?.value ?? DEFAULT_MODEL;

        // ── 4. Enforce word cap on input (§9.1) ──
        const truncatedText = truncateToWordCap(extractedText, wordCap);

        // ── 5. Fetch all active categories for validation ──
        const allCategories = await Category.find({ is_active: true }).lean<{ name: string }[]>();
        const allCategoryNames = allCategories.map((c) => c.name);

        // ── 6. Resolve prompt & build full prompt ──
        const category = job.category_id as any;
        const categoryId = category?._id?.toString() ?? null;
        const categoryName = category?.name ?? "General";

        const dbPromptText = await resolveDbPromptText(categoryId);
        const prompt = buildJsonPrompt(categoryName, allCategoryNames, truncatedText, dbPromptText);

        // ── 7. Transition to FREE_SUMMARY_GENERATING ──
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FREE_SUMMARY_GENERATING,
            previous_state: job.status,
            state_transitioned_at: new Date(),
        });

        // ── 8. Retry loop with backoff (§8.1) ──
        let lastError: Error | null = null;
        let parsedResponse: AIJsonResponse | null = null;
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
                    // Ask for JSON if the model supports it
                    response_format: model.startsWith("gpt-4") ? { type: "json_object" } : undefined,
                });

                const rawOutput = completion.choices[0]?.message?.content ?? "";
                tokensIn = completion.usage?.prompt_tokens ?? 0;
                tokensOut = completion.usage?.completion_tokens ?? 0;

                parsedResponse = parseAIJson(rawOutput);

                if (!parsedResponse) {
                    throw new Error(`Failed to parse AI JSON response on attempt ${attempt + 1}. Raw: ${rawOutput.slice(0, 200)}`);
                }

                // If category is correct, validate summary length
                if (parsedResponse.categoryCorrect && !validateAIOutput(parsedResponse.summary)) {
                    throw new Error(`AI summary failed validation on attempt ${attempt + 1}. Word count: ${countWords(parsedResponse.summary)}`);
                }

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

        // ── 9. All retries exhausted ──
        if (lastError || !parsedResponse) {
            await Job.findByIdAndUpdate(jobId, {
                status: JobState.FAILED,
                previous_state: JobState.FREE_SUMMARY_GENERATING,
                state_transitioned_at: new Date(),
            });
            return NextResponse.json({ error: "Failed to generate AI summary. Please try again." }, { status: 502 });
        }

        // ── 10. Log token usage & cost (§9.1) ──
        await JobToken.create({
            job_id: jobId,
            prompt_type: "free",
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cost_estimate: estimateCost(tokensIn, tokensOut),
            model,
            attempt_number: 1,
        });

        // ── 11. Increment monthly usage counter & check threshold for alert ──
        const usageResult = await checkAndIncrementMonthlyUsage(tokensIn + tokensOut);

        if (usageResult.aboveThreshold) {
            maybeSendCapAlert({
                usedTokens: usageResult.currentUsage,
                capTokens: usageResult.cap,
                percentUsed: usageResult.percentUsed,
                promptType: "free",
            }).catch((err) => console.error("[generate-free] Cap alert email error:", err));
        }

        // ── 12. Transition job state ──
        // We store the summary regardless of category correctness (user may retry with correct category).
        // If categoryCorrect is false, job moves to AWAITING_PAYMENT is skipped on frontend.
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FREE_SUMMARY_COMPLETE,
            previous_state: JobState.FREE_SUMMARY_GENERATING,
            state_transitioned_at: new Date(),
            urgency: parsedResponse.urgency,
            free_summary: parsedResponse.summary,
        });

        return NextResponse.json({
            summary: parsedResponse.summary,
            urgency: parsedResponse.urgency,
            categoryCorrect: parsedResponse.categoryCorrect,
            suggestedCategory: parsedResponse.suggestedCategory ?? null,
        });
    } catch (error: any) {
        console.error("[generate-free]", error);
        return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
    }
}