import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// NOTE: category_id values below are the ORIGINAL MongoDB ObjectIds.
// These match the ids you inserted via seed-categories.ts (which preserved them).
const mongoPrompts = [
    // ─── COURT / LEGAL ───────────────────────────────────────────────────────
    {
        _id: { $oid: "69bffdd0e9eb1d516cbc1634" },
        category_id: { $oid: "69b4007d208125dd980131f5" },
        type: "free",
        prompt_text: `You are a plain-English document simplifier specialising in legal correspondence.
The user has uploaded a Legal letter.

Summarise the letter in EXACTLY 100-130 words of plain English. Focus on what the letter is demanding or communicating, any deadlines mentioned, and what the recipient needs to know immediately.

Rules:
- No more than 130 words, no fewer than 100 words
- Plain English only — no legal jargon
- Be specific about what the letter says
- Do NOT provide legal advice
- End on its own line with exactly: URGENCY: Routine

Replace "Routine" with "Important" if there are deadlines within 30 days, or "Time-Sensitive" if action is required within 7 days or a court date is mentioned.

Document text:

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 3,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:04:20.741Z" },
    },
    {
        _id: { $oid: "69c779be5e011c59690941e7" },
        category_id: { $oid: "69b4007d208125dd980131f5" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this court or legal notice.
Write a clear explanation that covers:
    • Who initiated the claim
    • What it relates to
    • Any amounts involved
    • The response deadline
Then include:
    • What this means in practice (importance of responding)
    • Understanding your position (available response options)
    • If the claim doesn't look right
    • If you're unsure how to respond
    • What to do next (step-by-step)
    • Key things to check
Do NOT draft a defence or provide legal advice.
HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:10:58.090Z" },
    },

    // ─── GOVERNMENT / TAX ────────────────────────────────────────────────────
    {
        _id: { $oid: "69c75dad5e011c596909418f" },
        category_id: { $oid: "69b43f11240e8c4bdf47b417" },
        type: "free",
        prompt_text: `Analyse this government or tax letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Department
    • Issue
    • Financial amount
    • Deadline

Do NOT provide tax advice.

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T17:27:19.422Z" },
    },
    {
        _id: { $oid: "69bffffce9eb1d516cbc1641" },
        category_id: { $oid: "69b43f11240e8c4bdf47b417" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.

Analyse this government or tax letter.
Write a clear explanation that covers:
    • Department involved
    • Issue raised
    • Amount owed (if any)
    • Deadline
Then include:
    • What this means in practice
    • Understanding your position
    • If the amount doesn't look right
    • If you cannot pay
    • What to do next (step-by-step)
    • Key things to check
Do not provide tax advice.

HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 5,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:05:46.230Z" },
    },

    // ─── MEDICAL / HEALTH ─────────────────────────────────────────────────────
    {
        _id: { $oid: "69c754785e011c5969093fef" },
        category_id: { $oid: "69c72df05e011c5969093eb1" },
        type: "free",
        prompt_text: `Analyse this medical or health-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Who sent the letter (hospital, GP, specialist)
    • What it is about (appointment, results, referral etc.)
    • Any dates or appointments
    • Any action required
Do NOT interpret results beyond what is written.
Do NOT give medical advice.
{{document_text}}
{{category}}`,
        version: 2,
        is_active: true,
        updated_at: { $date: "2026-03-31T14:59:17.417Z" },
    },
    {
        _id: { $oid: "69c779c45e011c59690941ec" },
        category_id: { $oid: "69c72df05e011c5969093eb1" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this medical or health-related letter.
Write a clear, human explanation that covers:
    • What the letter is about
    • What has been said about results or appointments
    • What this means in practice (avoid medical interpretation beyond text)
Then include:
    • What this means in practice
    • Understanding your position
    • If anything is unclear
    • If you cannot attend / need to act
    • What to do next (step-by-step)
    • Key things to check
Do NOT provide medical treatment advice.
HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:05:20.216Z" },
    },

    // ─── MONEY OWED / OUTSTANDING PAYMENT ─────────────────────────────────────
    {
        _id: { $oid: "69c7566b5e011c5969094026" },
        category_id: { $oid: "69c72dfa5e011c5969093eb4" },
        type: "free",
        prompt_text: `Analyse this payment or debt-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Who is requesting payment
    • The amount and reason
    • Any deadline
    • What the letter is asking you to do
Do NOT suggest dispute strategies or legal actions.
{{document_text}}
{{category}}`,
        version: 2,
        is_active: true,
        updated_at: { $date: "2026-03-31T14:59:04.418Z" },
    },
    {
        _id: { $oid: "69c779d65e011c59690941fb" },
        category_id: { $oid: "69c72dfa5e011c5969093eb4" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.

Analyse this letter about money owed or payment.
Write a clear explanation that covers:
    • Who is requesting payment
    • The amount and why it is being requested
    • The deadline and tone of the letter
Then include:
    • What this means in practice (early escalation vs serious stage)
    • Understanding your position (options available)
    • If the amount doesn't look right
    • If you're unable to pay
    • What to do next (step-by-step)
    • Key things to check
Remain neutral. Do not provide legal tactics or dispute strategies.
HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:10:48.978Z" },
    },

    // ─── EMPLOYMENT / WORK ────────────────────────────────────────────────────
    {
        _id: { $oid: "69c7345c5e011c5969093fce" },
        category_id: { $oid: "69c72e1a5e011c5969093eb9" },
        type: "free",
        prompt_text: `Write the summary in a calm, clear, human tone — as if you are explaining the letter simply to someone who feels unsure or concerned.
Keep the summary between 120–130 words.
Focus only on:
•	What the letter is about
•	Who sent it
•	Any key amounts, dates, or deadlines
•	What action (if any) is required
Do NOT provide advice, strategy, or step-by-step guidance.
Do NOT interpret beyond what is written.

End every summary with:
"This is a summary only. A full breakdown explains the implications and next steps."
Analyse this employment-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
•	Nature of the issue
•	Any meeting or process
•	Any dates
•	Required action
Do NOT evaluate fairness or provide legal argument.

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T02:03:30.977Z" },
    },
    {
        _id: { $oid: "69c779ce5e011c59690941f6" },
        category_id: { $oid: "69c72e1a5e011c5969093eb9" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
•	What the letter is saying
•	What it means in practice
•	What the person can do next
Use short section headings (not overly formal) and only use bullet points where they genuinely improve clarity.
Analyse this employment-related letter.
Write a clear explanation that covers:
•	Nature of the issue (disciplinary, redundancy, etc.)
•	What stage of the process this appears to be
•	Any meeting or action required
Then include:
•	What this means in practice
•	Understanding your position (opportunity to respond)
•	If you disagree with what's stated
•	If you feel unprepared
•	What to do next (step-by-step)
•	Key things to check
Do not evaluate fairness or provide legal argument.

HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 9,
        is_active: true,
        updated_at: { $date: "2026-04-11T07:19:16.737Z" },
    },

    // ─── INSURANCE ────────────────────────────────────────────────────────────
    {
        _id: { $oid: "69c75c205e011c5969094120" },
        category_id: { $oid: "69c72e205e011c5969093ebc" },
        type: "free",
        prompt_text: `Analyse this insurance-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Type of insurance
    • Claim status
    • Financial outcome

Do NOT interpret policy beyond text.

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T17:35:59.125Z" },
    },
    {
        _id: { $oid: "69c779eb5e011c596909420a" },
        category_id: { $oid: "69c72e205e011c5969093ebc" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this insurance-related letter.
Write a clear explanation that covers:
    • Type of insurance
    • Claim status (approved, denied, partial)
    • Financial outcome
Then include:
    • What this means in practice
    • Understanding your position (options available)
    • If the decision doesn't look right
    • If you want to challenge the outcome
    • What to do next (step-by-step)
    • Key things to check
Do not interpret policy coverage beyond what is stated.
HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:05:28.712Z" },
    },

    // ─── BANK / FINANCIAL ─────────────────────────────────────────────────────
    {
        _id: { $oid: "69c75d6d5e011c596909417b" },
        category_id: { $oid: "69c72e305e011c5969093ebf" },
        type: "free",
        prompt_text: `Analyse this financial letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Institution
    • Issue raised
    • Financial amounts
    • Any deadlines

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T17:32:01.714Z" },
    },
    {
        _id: { $oid: "69c779fb5e011c5969094219" },
        category_id: { $oid: "69c72e305e011c5969093ebf" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this bank or financial letter.
Write a clear explanation that covers:
    • Institution involved
    • Account or issue referenced
    • Financial amounts
    • Any deadline
Then include:
    • What this means in practice
    • Understanding your position
    • If something doesn't look right
    • If you're experiencing financial difficulty
    • What to do next (step-by-step)
    • Key things to check
{{document_text}}
{{category}}`,
        version: 3,
        is_active: true,
        updated_at: { $date: "2026-03-31T15:00:55.708Z" },
    },

    // ─── HOUSING / RENT / MORTGAGE ─────────────────────────────────────────────
    {
        _id: { $oid: "69c75d7e5e011c5969094180" },
        category_id: { $oid: "69c72e405e011c5969093ec4" },
        type: "free",
        prompt_text: `Write the summary in a calm, clear, human tone — as if you are explaining the letter simply to someone who feels unsure or concerned.
Keep the summary between 120–130 words.
Focus only on:
•	What the letter is about
•	Who sent it
•	Any key amounts, dates, or deadlines
•	What action (if any) is required
Do NOT provide advice, strategy, or step-by-step guidance.
Do NOT interpret beyond what is written.

End every summary with:
"This is a summary only. A full breakdown explains the implications and next steps."
Analyse this housing-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
•	Type of notice
•	Amount owed
•	Deadline
•	Required action

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:02:55.821Z" },
    },
    {
        _id: { $oid: "69c779e45e011c5969094205" },
        category_id: { $oid: "69c72e405e011c5969093ec4" },
        type: "paid",
        prompt_text: `Add this to the top of EVERY breakdown prompt:
Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
•	What the letter is saying
•	What it means in practice
•	What the person can do next
Use short section headings (not overly formal) and only use bullet points where they genuinely improve clarity.
At the very start of the response, include a colour-coded urgency label exactly in this format:
🟢 Routine
🟠 Important
🔴 Time-Sensitive
Choose ONE based on the seriousness of the letter.
Do not explain the colour — just display it clearly
Analyse this housing-related letter.
Write a clear explanation that covers:
•	Type of notice
•	Reason (arrears, eviction risk, etc.)
•	Amount owed
•	Deadline
Then include:
•	What this means in practice
•	Understanding your position
•	If the amount doesn't look right
•	If you cannot pay
•	What to do next (step-by-step)
•   Key things to check

HERE IS THE TEXT:
{{document_text}}
Cateogory: {{category}}`,
        version: 5,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:09:54.340Z" },
    },

    // ─── UTILITY / SERVICE PROVIDER ───────────────────────────────────────────
    {
        _id: { $oid: "69c75d8b5e011c5969094185" },
        category_id: { $oid: "69c72e455e011c5969093ec7" },
        type: "free",
        prompt_text: `Analyse this utility or service provider letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Company
    • Issue
    • Amount
    • Deadline

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T17:39:06.759Z" },
    },
    {
        _id: { $oid: "69c779db5e011c5969094200" },
        category_id: { $oid: "69c72e455e011c5969093ec7" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this utility or service provider letter.
Write a clear explanation that covers:
    • Company involved
    • Issue raised
    • Amount owed
    • Deadline
Then include:
    • What this means in practice
    • Understanding your position
    • If the amount doesn't look right
    • If you cannot pay
    • What to do next (step-by-step)
    • Key things to check

{{document_text}}
{{category}}`,
        version: 3,
        is_active: true,
        updated_at: { $date: "2026-03-31T15:00:35.482Z" },
    },

    // ─── EDUCATION ────────────────────────────────────────────────────────────
    {
        _id: { $oid: "69cbfa0cef69f38a06d3d0c6" },
        category_id: { $oid: "69c72e4b5e011c5969093eca" },
        type: "free",
        prompt_text: `Analyse this education-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
•	Institution
•	Issue
•	Required action
HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}
•	Dates mentioned`,
        version: 2,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:02:38.053Z" },
    },
    {
        _id: { $oid: "69c779f55e011c5969094214" },
        category_id: { $oid: "69c72e4b5e011c5969093eca" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this education-related letter.
Write a clear explanation that covers:
    • School or institution
    • Issue raised
    • Required action
    • Any meeting or timeline
Then include:
    • What this means in practice
    • Understanding your position
    • If the concerns don't seem accurate
    • What to do next (step-by-step)
    • Key things to check
HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:11:19.765Z" },
    },

    // ─── BENEFITS ─────────────────────────────────────────────────────────────
    {
        _id: { $oid: "69c75d9f5e011c596909418a" },
        category_id: { $oid: "69c72e515e011c5969093ecd" },
        type: "free",
        prompt_text: `Analyse this education-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Institution
    • Issue
    • Dates mentioned

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T17:35:30.740Z" },
    },
    {
        _id: { $oid: "69c779f05e011c596909420f" },
        category_id: { $oid: "69c72e515e011c5969093ecd" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this benefits-related letter.
Write a clear explanation that covers:
    • Benefit involved
    • Decision made
    • Financial impact
    • Deadline
Then include:
    • What this means in practice
    • Understanding your position
    • If the decision doesn't look right
    • If you cannot repay
    • What to do next (step-by-step)
    • Key things to check
{{document_text}}
{{category}}`,
        version: 3,
        is_active: true,
        updated_at: { $date: "2026-03-31T15:00:10.323Z" },
    },

    // ─── SUBSCRIPTION ─────────────────────────────────────────────────────────
    {
        _id: { $oid: "69c75dc05e011c5969094194" },
        category_id: { $oid: "69c72e585e011c5969093ed0" },
        type: "free",
        prompt_text: `Analyse this contract-related letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • Company
    • Issue
    • Financial details

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T17:30:57.752Z" },
    },

    // ─── I'M NOT SURE ──────────────────────────────────────────────────────────
    {
        _id: { $oid: "69c75dcf5e011c5969094199" },
        category_id: { $oid: "69c72e665e011c5969093ed3" },
        type: "free",
        prompt_text: `Analyse this letter and determine the likely category.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining:
    • What the letter appears to be about
    • Likely category
    • Any amounts or deadlines
    • Required action
{{document_text}}{{category}}`,
        version: 2,
        is_active: true,
        updated_at: { $date: "2026-03-31T14:57:29.007Z" },
    },
    {
        _id: { $oid: "69c77a055e011c5969094223" },
        category_id: { $oid: "69c72e665e011c5969093ed3" },
        type: "paid",
        prompt_text: `Write the response in a calm, clear, human tone — as if you are explaining the letter to someone who feels unsure or concerned.
The output must be approximately 70% sentences/paragraphs and 30% bullet points.
Avoid overly technical or robotic formatting. Focus on:
    • What the letter is saying
    • What it means in practice
    • What the person can do next
Use short section headings (not overly formal), and only use bullet points where they genuinely improve clarity.
Analyse this letter and determine the most likely category.
Write a clear explanation that covers:
    • What the letter appears to be about
    • Why it fits a particular category
    • Any amounts or deadlines
Then include:
    • What this means in practice
    • Understanding your position
    • If something doesn't make sense
    • What to do next (step-by-step)
    • Key things to check
HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:06:04.640Z" },
    },

    // ─── PARKING ──────────────────────────────────────────────────────────────
    {
        _id: { $oid: "69cbf9a0ef69f38a06d3d0bf" },
        category_id: { $oid: "69cbf414ef69f38a06d3d088" },
        type: "free",
        prompt_text: `Analyse this parking or penalty charge letter.
Include a colour-coded urgency label.
Write a 120–130 word summary explaining, with these proper headings:
•	Who issued the notice (council or private parking company)
•	What the charge relates to (parking breach, overstay, no ticket, etc.)
•	The amount being requested (including any reduced payment window if mentioned)
•	Any deadlines provided
•	What the letter is asking you to do
Do NOT suggest appeal strategies or legal arguments.
Do NOT assume guilt or fault.
End with:
"This is a summary only. A full breakdown explains the implications and next steps."

HERE IS THE DOCUMENT TEXT: {{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-04T17:07:55.894Z" },
    },
    {
        _id: { $oid: "69cbf89bef69f38a06d3d0b2" },
        category_id: { $oid: "69cbf414ef69f38a06d3d088" },
        type: "paid",
        prompt_text: `Analyse this parking or penalty charge letter.
Write a clear, human explanation that covers:
•	Who issued the notice (council or private company)
•	What the charge relates to
•	The amount and any reduced payment period
•	Any deadlines or response requirements
Then include:

What this means in practice
Explain whether this is a formal fine, a charge, or part of an enforcement process, and how serious it is.
Understanding your position
Clarify that the recipient may have options (pay, respond, request clarification), without giving legal advice.
If the charge doesn't look right
Explain what details the person may want to check (timings, signage, vehicle details, etc.).
If you're unsure how to respond
Provide calm, practical guidance on reviewing the notice and understanding what it says.
What to do next (step-by-step)
•	Review the notice carefully
•	Check the deadline and amount
•	Decide whether to pay or respond
•	Keep a record of any communication

Key things to check
•	The amount being requested
•	Any reduced payment window
•	The deadline for action
•	Who issued the notice
•	The reason for the charge

⚠️ RULES (aligned with your system)
•	Do NOT provide legal defence or appeal strategies
•	Do NOT interpret beyond what is written
•	Keep tone calm, neutral, and reassuring
•	Maintain ~70% paragraph / 30% bullet structure

HERE IS THE DOCUMENT TEXT:
{{document_text}}
Category: {{category}}`,
        version: 4,
        is_active: true,
        updated_at: { $date: "2026-04-03T03:04:41.616Z" },
    },
];

async function main() {
    console.log("Start seeding prompts...");

    const formattedPrompts = mongoPrompts.map((p) => ({
        // NOTE: We do NOT preserve the Mongo _id here because Prisma's Prompt.id
        // is a uuid() by default and Postgres won't accept a raw ObjectId string
        // as a UUID. If you want to preserve IDs, change the Prompt model id field
        // to String @id (no @default) and uncomment the line below.
        // id: p._id.$oid,
        category_id: p.category_id.$oid, // matches the preserved Category.id
        type: p.type as "free" | "paid",
        prompt_text: p.prompt_text,
        version: p.version,
        is_active: p.is_active,
        updated_at: new Date(p.updated_at.$date),
    }));

    const result = await prisma.prompt.createMany({
        data: formattedPrompts,
        skipDuplicates: true,
    });

    console.log(`Successfully inserted ${result.count} prompts.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
