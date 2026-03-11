import { NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
    try {
        const { jobId, extractedText } = await request.json();

        if (!jobId || !extractedText) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        await dbConnect();
        const job = await Job.findById(jobId);
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Verify payment was actually confirmed before doing expensive AI work
        if (job.status !== JobState.PAYMENT_CONFIRMED) {
            return NextResponse.json({ error: "Payment not confirmed for this job" }, { status: 403 });
        }

        // Advance state to PAID_BREAKDOWN_GENERATING
        job.previous_state = job.status;
        job.status = JobState.PAID_BREAKDOWN_GENERATING;
        job.state_transitioned_at = new Date();
        await job.save();

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.PAYMENT_CONFIRMED,
            to_state: JobState.PAID_BREAKDOWN_GENERATING,
            triggered_by: "system_generate_paid_route",
        });

        // 1. Build the Dynamic Prompt based on purchased upsells
        const upsells = job.selected_upsells || [];
        let systemPrompt = `You are an expert legal and administrative assistant. 
Your task is to provide a highly detailed, comprehensive breakdown of the provided document.
You MUST reply in JSON format with a single key: "detailed_breakdown".
The value should be formatted in Markdown, using clear headings (e.g., ### Section Name), bullet points, and bold text for emphasis.

Include the following sections:
1. **Core Purpose**: A deep dive into exactly what this letter is demanding or stating.
2. **Key Dates & Deadlines**: Highlight any critical timelines.
3. **Required Actions**: Step-by-step instructions on what the user must do next.
4. **Potential Consequences**: What happens if the user ignores this.`;

        // Inject Upsell Logic
        if (upsells.includes("legal_formatting")) {
            systemPrompt += `\n\nUPSELL PURCHASED - Legal Formatting: Format the output as a formal legal memorandum. Use highly professional, structured legal terminology where appropriate, while keeping it accessible.`;
        }

        if (upsells.includes("tone_rewrite")) {
            systemPrompt += `\n\nUPSELL PURCHASED - Tone Rewrite: Add a 5th section titled "**Suggested Response Draft**". Write a polite, highly professional, and perfectly toned template that the user can copy and paste to reply to the sender.`;
        }

        // 2. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Here is the document text:\n\n${extractedText}` },
            ],
            temperature: 0.3,
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content!);

        // 3. Save the result and advance state to COMPLETED
        job.paid_summary = aiResponse.detailed_breakdown;
        job.previous_state = job.status;
        job.status = JobState.COMPLETED;
        job.state_transitioned_at = new Date();
        await job.save();

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.PAID_BREAKDOWN_GENERATING,
            to_state: JobState.COMPLETED,
            triggered_by: "system_generate_paid_route",
        });

        return NextResponse.json(
            {
                message: "Detailed breakdown generated successfully",
                detailedBreakdown: aiResponse.detailed_breakdown,
            },
            { status: 200 },
        );
    } catch (error: any) {
        console.error("Paid Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate paid summary" }, { status: 500 });
    }
}
