// src/app/api/generate-paid/route.ts
//
// CRITICAL: This route must ONLY be called by the internal Stripe webhook handler.
// It must NEVER be called directly from client-side code (§7.2).
// The webhook handler verifies payment before calling this function.
//
// Requirement constraints (§8, §9, §10):
//   • Payment lock: job must be in PAYMENT_CONFIRMED state
//   • Category-specific paid prompt fetched from DB (§10.2) — falls back to hardcoded default
//   • Token caps: configurable max input/output tokens (from Settings)
//   • 1,200-word hard cap on input text
//   • Semantic chunking for long documents
//   • 3 retries with 2s/5s backoff
//   • AI output validation
//   • Token usage & cost logging
//   • Global monthly cap check
//   • OpenAI model read from Settings DB (openai_model key) — falls back to gpt-4.1

import OpenAI from "openai";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import { Setting } from "@/models/Setting";
import { Prompt } from "@/models/Prompt";
import { JobToken } from "@/models/JobToken";
import { checkAndIncrementMonthlyUsage } from "@/lib/tokenBudget";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_WORD_HARD_CAP = 1200;
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [0, 2000, 5000];
const DEFAULT_MAX_OUTPUT_TOKENS = 2000;
const DEFAULT_MAX_INPUT_TOKENS = 4000;
const DEFAULT_MODEL = "gpt-4.1";
const COST_PER_1M_INPUT = 2.0;
const COST_PER_1M_OUTPUT = 8.0;

const MANDATORY_PAID_RULES = `

---
MANDATORY SYSTEM INSTRUCTIONS (These override any previous instructions):
1. Do NOT provide legal, financial, or professional advice under any circumstances.
2. You MUST end your response on a new, separate line with EXACTLY this format: URGENCY: [Level]
3. The [Level] MUST be exactly one of these three words: Routine, Important, or Time-Sensitive.
4. Do NOT use any colours, HTML, Markdown formatting, or extra text for the urgency label. It must be plain, unformatted text.

URGENCY CLASSIFICATION RULES:
Determine the urgency level based on the specific instructions provided by the user earlier in this prompt. 
If, and ONLY if, no specific timeframes or conditions were provided above, use these default rules:
- Time-Sensitive: Use this if there is ANY specific deadline, due date, or court date mentioned in the text.
- Important: Use this if there are no strict deadlines, but the issue significantly affects important aspects of the recipient's life, career, finances, or legal standing.
- Routine: Use this for all other general or informational correspondence.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function validateOutput(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    if (text.includes("\uFFFD")) return false;
    return text.trim().length > 50;
}

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── DB Prompt Lookup (§10.2) ─────────────────────────────────────────────────
//
// Priority order:
//   1. Active category-specific paid prompt for this category
//   2. Active generic paid prompt (no category_id)
//   3. Hardcoded fallback (below)
//
// Placeholders replaced before sending:
//   {{document_text}} → truncatedText
//   {{category}}      → categoryName
//   {{urgency}}       → job urgency from free summary stage

async function resolvePromptTemplate(
    categoryId: string | null,
    categoryName: string,
    documentText: string,
    urgency: string,
    upsellInstructions: string,
): Promise<string> {
    let dbPromptText: string | null = null;

    try {
        // 1. Category-specific paid prompt
        if (categoryId) {
            const categoryPrompt = await Prompt.findOne({
                category_id: categoryId,
                type: "paid",
                is_active: true,
            })
                .sort({ version: -1 })
                .lean<{ prompt_text: string }>();

            if (categoryPrompt?.prompt_text) {
                dbPromptText = categoryPrompt.prompt_text;
            }
        }

        // 2. Generic paid prompt
        if (!dbPromptText) {
            const genericPrompt = await Prompt.findOne({
                category_id: { $exists: false },
                type: "paid",
                is_active: true,
            })
                .sort({ version: -1 })
                .lean<{ prompt_text: string }>();

            if (genericPrompt?.prompt_text) {
                dbPromptText = genericPrompt.prompt_text;
            }
        }
    } catch (err) {
        console.warn("[generate-paid] Failed to load prompt from DB, using fallback:", err);
    }

    // 3. If DB prompt found, hydrate it, add upsells, and append mandatory rules
    if (dbPromptText) {
        const hydrated = hydratePlaceholders(dbPromptText, {
            categoryName,
            documentText,
            urgency,
            upsellInstructions,
        });
        return hydrated + MANDATORY_PAID_RULES;
    }

    // 4. Hardcoded fallback
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
        // Append upsell instructions after the template if any
        (vars.upsellInstructions ? `\n\n${vars.upsellInstructions}` : "")
    );
}

function buildFallbackPrompt(categoryName: string, documentText: string, upsellInstructions: string): string {
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
- Use plain English throughout
- Highlight deadlines and required actions prominently
- Be specific and actionable

Document text:
${documentText}
${MANDATORY_PAID_RULES}`;
}

// ─── Upsell instruction builder ───────────────────────────────────────────────

function buildUpsellInstructions(upsells: string[]): string {
    if (!upsells || upsells.length === 0) return "";
    const instructions: string[] = [];
    if (upsells.some((u) => u.toLowerCase().includes("legal"))) {
        instructions.push("7. **Legal Formatting** — Format key legal clauses in a structured legal style with clear clause references.");
    }
    if (upsells.some((u) => u.toLowerCase().includes("tone"))) {
        instructions.push("8. **Tone Rewrite** — Provide a suggested reply or response in a professional, clear tone.");
    }
    if (upsells.some((u) => u.toLowerCase().includes("detail"))) {
        instructions.push("9. **Extended Detail** — Expand on each section with additional context and explanations.");
    }
    return instructions.join("\n");
}

// ─── Main exported function (called by webhook handler) ───────────────────────

export async function generatePaidBreakdown(jobId: string, extractedText: string, upsells: string[] = []): Promise<{ detailedBreakdown: string }> {
    await connectToDatabase();

    // ── 1. Re-validate job state (payment lock, §7.2) ──
    const job = await Job.findById(jobId).populate("category_id").lean<any>();
    if (!job) throw new Error("Job not found.");
    if (job.status !== "PAYMENT_CONFIRMED") {
        throw new Error(`Cannot generate paid breakdown — job in unexpected state: ${job.status}`);
    }

    // ── 2. Check global monthly token cap (§9.2) ──
    const capResult = await checkAndIncrementMonthlyUsage(0);
    if (!capResult.allowed) {
        throw new Error("Monthly token cap reached. Paid generation paused.");
    }

    // ── 3. Fetch configurable settings ──
    const [maxOutputSetting, wordCapSetting, modelSetting] = await Promise.all([
        Setting.findOne({ key: "ai_max_output_tokens_paid" }).lean<any>(),
        Setting.findOne({ key: "ai_input_word_cap" }).lean<any>(),
        Setting.findOne({ key: "openai_model" }).lean<any>(),
    ]);

    const maxOutputTokens: number = maxOutputSetting?.value ?? DEFAULT_MAX_OUTPUT_TOKENS;
    const wordCap: number = wordCapSetting?.value ?? INPUT_WORD_HARD_CAP;
    const model: string = modelSetting?.value ?? DEFAULT_MODEL;

    // ── 4. Enforce word cap on input (§9.1) ──
    const truncatedText = truncateToWordCap(extractedText, wordCap);

    // ── 5. Resolve prompt from DB (§10.2), fall back to hardcoded if none ──
    const category = job.category_id as any;
    const categoryId = category?._id?.toString() ?? null;
    const categoryName = category?.name ?? "General";

    // We use 'let' because the AI might upgrade the urgency during generation
    let urgency = job.urgency ?? "Routine";

    const upsellInstructions = buildUpsellInstructions(upsells);

    const prompt = await resolvePromptTemplate(categoryId, categoryName, truncatedText, urgency, upsellInstructions);

    // ── 6. Transition to PAID_BREAKDOWN_GENERATING ──
    await Job.findByIdAndUpdate(jobId, {
        status: "PAID_BREAKDOWN_GENERATING",
        previous_state: "PAYMENT_CONFIRMED",
        state_transitioned_at: new Date(),
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

            // ── PARSE AND STRIP URGENCY ──
            const urgencyMatch = rawOutput.match(/URGENCY:\s*(Routine|Important|Time-Sensitive)/i);
            if (urgencyMatch) {
                urgency = urgencyMatch[1]; // Update the local urgency variable
            }

            // Remove the urgency line entirely from the final text
            const cleanedBreakdown = rawOutput.replace(/URGENCY:\s*(Routine|Important|Time-Sensitive)/i, "").trim();

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
        await JobToken.create({
            job_id: jobId,
            prompt_type: "paid",
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cost_estimate: estimateCost(tokensIn, tokensOut),
            model,
            attempt_number: attemptNumber,
        });
        await checkAndIncrementMonthlyUsage(tokensIn + tokensOut);
    }

    // ── 9. Handle failure ──
    if (lastError) {
        await Job.findByIdAndUpdate(jobId, {
            status: "FAILED",
            previous_state: "PAID_BREAKDOWN_GENERATING",
            state_transitioned_at: new Date(),
        });
        throw lastError;
    }

    // ── 10. Transition to COMPLETED ──
    await Job.findByIdAndUpdate(jobId, {
        status: "COMPLETED",
        previous_state: "PAID_BREAKDOWN_GENERATING",
        state_transitioned_at: new Date(),
        processed_at: new Date(),
        paid_summary: detailedBreakdown, // Saved completely clean
        urgency: urgency, // Saved to DB
    });

    return { detailedBreakdown };
}
