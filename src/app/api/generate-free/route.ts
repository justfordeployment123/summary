import { NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { JobState, PromptType } from "@prisma/client";
import { checkAndIncrementMonthlyUsage } from "@/lib/tokenBudget";
import { maybeSendCapAlert } from "@/lib/sendCapAlert";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────
const INPUT_WORD_HARD_CAP = 1200;
const FREE_SUMMARY_MIN_WORDS = 100;
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [0, 2000, 5000];
const DEFAULT_MAX_OUTPUT_TOKENS = 500;
const DEFAULT_MAX_INPUT_TOKENS = 2000;
const DEFAULT_MODEL = "gpt-4o";
const COST_PER_1M_INPUT = 2.0;
const COST_PER_1M_OUTPUT = 8.0;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function truncateToWordCap(text: string, cap: number): string {
    const words = text.trim().split(/\s+/);
    return words.length <= cap ? text : words.slice(0, cap).join(" ");
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIJsonResponse {
    topCategories: { name: string; confidence: number }[];
    summary: string;
    urgency: "Routine" | "Important" | "Time-Sensitive";
}

function parseAIJson(raw: string): AIJsonResponse | null {
    try {
        const cleaned = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
        const parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed.topCategories) || parsed.topCategories.length === 0) return null;

        parsed.topCategories = parsed.topCategories
            .slice(0, 3)
            .map((c: any) => ({
                name: typeof c.name === "string" ? c.name : "",
                confidence: typeof c.confidence === "number" ? Math.round(c.confidence) : 0,
            }))
            .filter((c: any) => c.name);

        if (!["Routine", "Important", "Time-Sensitive"].includes(parsed.urgency)) {
            parsed.urgency = "Routine";
        }
        if (typeof parsed.summary !== "string") parsed.summary = "";

        return parsed as AIJsonResponse;
    } catch {
        return null;
    }
}

function buildJsonPrompt(categoryName: string, allCategories: string[], documentText: string, dbPromptText?: string | null): string {
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

Rank the top 1–3 categories this document could belong to, with a confidence percentage for each.
Then produce your response as a single JSON object with EXACTLY these three fields:

{
  "topCategories": [
    { "name": "Best matching category name from the list above", "confidence": 85 },
    { "name": "Second best match", "confidence": 10 },
    { "name": "Third best match", "confidence": 5 }
  ],
  "summary": "Your 100–130 word plain English summary using Proper Markdown (bold, bullets).",
  "urgency": "Routine" or "Important" or "Time-Sensitive"
}

CATEGORY RANKING RULES:
Step 1 — Identify the PRIMARY PURPOSE: What is the single main reason this document was created?
  Write this as a one-sentence answer internally before ranking (do not include it in the JSON output).

Step 2 — Match to categories using PRIMARY PURPOSE only:
  - Pick the category whose name best matches the primary purpose, not surface keywords.

Step 3 — Assign confidence:
  - The #1 category must have confidence ≥ 60.
  - Only add a 2nd entry if it genuinely competes with ≥ 20% confidence. Do not pad.
  - Only add a 3rd entry if it genuinely competes with ≥ 15% confidence. Do not pad.
  - Confidence values must sum to 100.
  - Include at least 1 entry, at most 3.

URGENCY RULES:
- "Time-Sensitive": any specific deadline, due date, or court date mentioned.
- "Important": no strict deadline but significantly affects finances, health, legal standing, or career.
- "Routine": all other general or informational correspondence.

SUMMARY RULES:
- 100–130 words, plain English, Proper Markdown formatting.
- No professional advice. Be specific about what the letter says.
- RETURN THE SUMMARY IN ENGLISH, regardless of the input language.

OUTPUT: Return ONLY the JSON object. No preamble, no explanation, no markdown fences.`;
}

function hydratePlaceholders(template: string, vars: { categoryName: string; documentText: string }): string {
    return template.replace(/\{\{document_text\}\}/g, vars.documentText).replace(/\{\{category\}\}/g, vars.categoryName);
}

function buildFallbackSummaryBlock(categoryName: string, documentText: string): string {
    return `You are an expert document simplifier. The user has uploaded a document they believe is a "${categoryName}" letter.\n\nDocument text:\n${documentText}`;
}

// ─── DB Prompt Lookup ─────────────────────────────────────────────────────────
async function resolveDbPromptText(categoryId: string | null): Promise<string | null> {
    try {
        if (categoryId) {
            const categoryPrompt = await prisma.prompt.findFirst({
                where: { category_id: categoryId, type: PromptType.free, is_active: true },
                orderBy: { version: "desc" },
                select: { prompt_text: true },
            });
            if (categoryPrompt?.prompt_text) return categoryPrompt.prompt_text;
        }

        const genericPrompt = await prisma.prompt.findFirst({
            where: { category_id: null, type: PromptType.free, is_active: true },
            orderBy: { version: "desc" },
            select: { prompt_text: true },
        });
        if (genericPrompt?.prompt_text) return genericPrompt.prompt_text;
    } catch (err) {
        console.warn("[generate-free] Failed to load prompt from DB:", err);
    }
    return null;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { jobId, extractedText } = body;

        if (!jobId || !extractedText) {
            return NextResponse.json({ error: "Missing required fields: jobId, extractedText." }, { status: 400 });
        }

        // ── 1. Validate job (with category included) ──
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { category: true },
        });
        console.log(job);
        if (!job) {
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }
        if (!([JobState.OCR_PROCESSING, JobState.FREE_SUMMARY_GENERATING, JobState.UPLOADED] as JobState[]).includes(job.status)) {
            console.warn(`[generate-free] Job ${jobId} in unexpected state: ${job.status}`);
        }

        // ── 2. Check global monthly token cap ──
        const preCheck = await checkAndIncrementMonthlyUsage(0);
        if (!preCheck.allowed) {
            return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
        }

        // ── 3. Fetch configurable settings ──
        const [maxOutputTokensSetting, wordCapSetting, modelSetting] = await Promise.all([
            prisma.setting.findUnique({ where: { key: "ai_max_output_tokens_free" } }),
            prisma.setting.findUnique({ where: { key: "ai_input_word_cap" } }),
            prisma.setting.findUnique({ where: { key: "openai_model" } }),
        ]);

        const maxOutputTokens: number = ((maxOutputTokensSetting?.value as number) ?? DEFAULT_MAX_OUTPUT_TOKENS) + 150;
        const wordCap: number = (wordCapSetting?.value as number) ?? INPUT_WORD_HARD_CAP;
        const model: string = (modelSetting?.value as string) ?? DEFAULT_MODEL;

        // ── 4. Enforce word cap on input ──
        const truncatedText = truncateToWordCap(extractedText, wordCap);

        // ── 5. Fetch all active categories ──
        const allCategories = await prisma.category.findMany({
            where: { is_active: true },
            select: { name: true },
        });
        const allCategoryNames = allCategories.map((c) => c.name);

        // ── 6. Resolve prompt & build full prompt ──
        // Note: category is now directly on job via Prisma relation (not nested _id)
        const category = job.category;
        const categoryId = category?.id ?? null;
        const categoryName = category?.name ?? "General";

        const dbPromptText = await resolveDbPromptText(categoryId);
        const prompt = buildJsonPrompt(categoryName, allCategoryNames, truncatedText, dbPromptText);

        // ── 7. Transition to FREE_SUMMARY_GENERATING ──
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: JobState.FREE_SUMMARY_GENERATING,
                previous_state: job.status,
                state_transitioned_at: new Date(),
            },
        });

        // ── 8. Retry loop with backoff ──
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
                    messages: [
                        {
                            role: "system",
                            content: `You are a strict document classifier and summariser. 
Your classification decisions must be DETERMINISTIC and CONSISTENT — given the same document you must always return the same top category.
Classification rules:
- Base your category decision ONLY on the PRIMARY PURPOSE of the document.
- A document's primary purpose is what the sender intended the recipient to DO or KNOW.
- Ignore surface-level keywords. An assignment brief mentioning "work" is about education, not employment.
- Never let summary content influence your category ranking. Classify first, summarise second.
- When two categories seem close, ask: "What would this person file this under?" — use that.`,
                        },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.0,
                    seed: 42,
                    response_format: model.startsWith("gpt-4") ? { type: "json_object" } : undefined,
                });

                const rawOutput = completion.choices[0]?.message?.content ?? "";
                tokensIn = completion.usage?.prompt_tokens ?? 0;
                tokensOut = completion.usage?.completion_tokens ?? 0;

                parsedResponse = parseAIJson(rawOutput);
                if (!parsedResponse) {
                    throw new Error(`Failed to parse AI JSON on attempt ${attempt + 1}. Raw: ${rawOutput.slice(0, 200)}`);
                }
                if (!validateAIOutput(parsedResponse.summary)) {
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
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: JobState.FAILED,
                    previous_state: JobState.FREE_SUMMARY_GENERATING,
                    state_transitioned_at: new Date(),
                },
            });
            return NextResponse.json({ error: "Failed to generate AI summary. Please try again." }, { status: 502 });
        }

        // ── 10. Log token usage & cost ──
        await prisma.jobToken.create({
            data: {
                job_id: jobId,
                prompt_type: PromptType.free,
                tokens_in: tokensIn,
                tokens_out: tokensOut,
                cost_estimate: estimateCost(tokensIn, tokensOut),
                ai_model: model,
                attempt_number: 1,
            },
        });

        // ── 11. Increment monthly usage & check alert threshold ──
        const usageResult = await checkAndIncrementMonthlyUsage(tokensIn + tokensOut);
        if (usageResult.aboveThreshold) {
            maybeSendCapAlert({
                usedTokens: usageResult.currentUsage,
                capTokens: usageResult.cap,
                percentUsed: usageResult.percentUsed,
                promptType: "free",
            }).catch((err) => console.error("[generate-free] Cap alert email error:", err));
        }

        // ── 12. Transition job state & persist summary to Temp ──
        await Promise.all([
            prisma.job.update({
                where: { id: jobId },
                data: {
                    status: JobState.FREE_SUMMARY_COMPLETE,
                    previous_state: JobState.FREE_SUMMARY_GENERATING,
                    state_transitioned_at: new Date(),
                    urgency: parsedResponse.urgency === "Time-Sensitive" ? "Time_Sensitive" : parsedResponse.urgency,
                },
            }),
            prisma.temp.upsert({
                where: { job_id: jobId },
                update: { extracted_text: parsedResponse.summary },
                create: { job_id: jobId, extracted_text: parsedResponse.summary },
            }),
        ]);

        // ── 13. Category correctness check ──
        const topCategoryNames = parsedResponse.topCategories.map((c) => c.name);
        const categoryCorrect = (() => {
            const matchIndex = topCategoryNames.indexOf(categoryName.trim());
            if (matchIndex === -1) return false;
            if (matchIndex === 0) return true;
            return parsedResponse!.topCategories[matchIndex].confidence >= 35;
        })();

        return NextResponse.json({
            summary: parsedResponse.summary,
            urgency: parsedResponse.urgency,
            categoryCorrect,
            topCategories: parsedResponse.topCategories,
        });
    } catch (error: any) {
        console.error("[generate-free]", error);
        return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
    }
}
