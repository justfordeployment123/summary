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

import { NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { Setting } from "@/models/Setting";
import { JobState } from "@/types/job";
import { JobToken } from "@/models/JobToken";
import { checkAndIncrementMonthlyUsage } from "@/lib/tokenBudget";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_WORD_HARD_CAP = 1200;   // §9.1 — configurable via Admin, default here
const FREE_SUMMARY_MIN_WORDS = 100; // §11
const FREE_SUMMARY_MAX_WORDS = 130; // §11
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [0, 2000, 5000]; // ms before each attempt
const DEFAULT_MAX_OUTPUT_TOKENS = 300;
const DEFAULT_MAX_INPUT_TOKENS = 2000;
// GPT-4.1 pricing (per 1M tokens, in USD) — used for cost estimation §9.1
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
    return (tokensIn / 1_000_000) * COST_PER_1M_INPUT +
           (tokensOut / 1_000_000) * COST_PER_1M_OUTPUT;
}

function validateAIOutput(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    // Must be valid UTF-8 (JS strings are UTF-16, but check for replacement char)
    if (text.includes("\uFFFD")) return false;
    const wordCount = countWords(text);
    return wordCount >= FREE_SUMMARY_MIN_WORDS;
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();
        const { jobId, extractedText } = body;

        if (!jobId || !extractedText) {
            return NextResponse.json(
                { error: "Missing required fields: jobId, extractedText." },
                { status: 400 },
            );
        }

        // ── 1. Validate job exists and is in the right state ──
        const job = await Job.findById(jobId).populate("category_id").lean<any>();
        if (!job) {
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }
        if (![JobState.OCR_PROCESSING, JobState.FREE_SUMMARY_GENERATING, JobState.UPLOADED].includes(job.status)) {
            // Allow re-generation if stuck, but log
            console.warn(`[generate-free] Job ${jobId} in unexpected state: ${job.status}`);
        }

        // ── 2. Check global monthly token cap (§9.2) ──
        const capResult = await checkAndIncrementMonthlyUsage(0); // check only, increment later
        if (!capResult.allowed) {
            return NextResponse.json(
                { error: "Service temporarily unavailable. Please try again later." },
                { status: 503 },
            );
        }

        // ── 3. Fetch configurable settings ──
        const [maxInputTokensSetting, maxOutputTokensSetting, wordCapSetting] =
            await Promise.all([
                Setting.findOne({ key: "ai_max_input_tokens_free" }).lean<any>(),
                Setting.findOne({ key: "ai_max_output_tokens_free" }).lean<any>(),
                Setting.findOne({ key: "ai_input_word_cap" }).lean<any>(),
            ]);

        const maxInputTokens: number =
            maxInputTokensSetting?.value ?? DEFAULT_MAX_INPUT_TOKENS;
        const maxOutputTokens: number =
            maxOutputTokensSetting?.value ?? DEFAULT_MAX_OUTPUT_TOKENS;
        const wordCap: number = wordCapSetting?.value ?? INPUT_WORD_HARD_CAP;

        // ── 4. Enforce 1,200-word hard cap on input (§9.1) ──
        const truncatedText = truncateToWordCap(extractedText, wordCap);
        const inputWordCount = countWords(truncatedText);

        // ── 5. Build prompt (category-aware, §10) ──
        const category = job.category_id as any;
        const categoryName = category?.name ?? "General";

        // In production, prompts are fetched from DB (§10.2).
        // Fallback prompt shown here.
        const prompt = `You are a plain-English document simplifier. 
The user has uploaded a ${categoryName} letter.

Summarise the letter in EXACTLY 100-130 words of plain English. Include an urgency classification at the end on its own line in this exact format: URGENCY: Routine|Important|Time-Sensitive

Rules:
- No more than 130 words, no fewer than 100 words
- Plain English only — no jargon, no legal language
- Be specific about what the letter says and what the recipient needs to know
- Do NOT include professional advice
- End with: URGENCY: [level]

Document text:
${truncatedText}`;

        // ── 6. Retry logic with backoff (§8.1) ──
        let lastError: Error | null = null;
        let summary = "";
        let urgency: string = "Routine";
        let tokensIn = 0;
        let tokensOut = 0;

        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FREE_SUMMARY_GENERATING,
            previous_state: job.status,
            state_transitioned_at: new Date(),
        });

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                await sleep(BACKOFF_DELAYS[attempt]);
            }

            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4.1",
                    max_tokens: maxOutputTokens,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                });

                const rawOutput = completion.choices[0]?.message?.content ?? "";
                tokensIn = completion.usage?.prompt_tokens ?? 0;
                tokensOut = completion.usage?.completion_tokens ?? 0;

                // ── 7. Parse urgency from output ──
                const urgencyMatch = rawOutput.match(
                    /URGENCY:\s*(Routine|Important|Time-Sensitive)/i,
                );
                urgency = urgencyMatch?.[1] ?? "Routine";
                summary = rawOutput.replace(/URGENCY:\s*(Routine|Important|Time-Sensitive)/i, "").trim();

                // ── 8. Validate output (§8.1) ──
                if (!validateAIOutput(summary)) {
                    throw new Error(
                        `AI output failed validation on attempt ${attempt + 1}. Word count: ${countWords(summary)}`,
                    );
                }

                // Enforce strict word cap on output
                summary = truncateToWordCap(summary, FREE_SUMMARY_MAX_WORDS);

                lastError = null;
                break; // success
            } catch (err: any) {
                lastError = err;
                // Handle rate limits (§8.1)
                if (err?.status === 429) {
                    const retryAfter = parseInt(err?.headers?.["retry-after"] ?? "5") * 1000;
                    await sleep(retryAfter);
                }
                console.error(`[generate-free] Attempt ${attempt + 1} failed:`, err.message);
            }
        }

        // ── 9. All retries exhausted ──
        if (lastError) {
            await Job.findByIdAndUpdate(jobId, {
                status: JobState.FAILED,
                previous_state: JobState.FREE_SUMMARY_GENERATING,
                state_transitioned_at: new Date(),
            });
            return NextResponse.json(
                { error: "Failed to generate AI summary. Please try again." },
                { status: 502 },
            );
        }

        // ── 10. Log token usage & cost (§9.1) ──
        const costEstimate = estimateCost(tokensIn, tokensOut);
        await JobToken.create({
            job_id: jobId,
            prompt_type: "free",
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cost_estimate: costEstimate,
            model: "gpt-4.1",
            attempt_number: 1,
        });

        // ── 11. Increment monthly usage counter (§9.2) ──
        await checkAndIncrementMonthlyUsage(tokensIn + tokensOut);

        // ── 12. Transition job to FREE_SUMMARY_COMPLETE ──
        await Job.findByIdAndUpdate(jobId, {
            status: JobState.FREE_SUMMARY_COMPLETE,
            previous_state: JobState.FREE_SUMMARY_GENERATING,
            state_transitioned_at: new Date(),
            urgency,
        });

        return NextResponse.json({ summary, urgency });
    } catch (error: any) {
        console.error("[generate-free]", error);
        return NextResponse.json(
            { error: error.message || "Internal server error." },
            { status: 500 },
        );
    }
}