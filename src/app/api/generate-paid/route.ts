import { NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import Temp from "@/models/Temp";
import { JobStateLog } from "@/models/JobStateLog";
import { JobState } from "@/types/job";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
    let currentJobId: string | null = null;

    try {
        const body = await request.json();
        currentJobId = body.jobId;

        if (!currentJobId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        await dbConnect();
        const job = await Job.findById(currentJobId);
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        if (job.status !== JobState.PAYMENT_CONFIRMED) {
            return NextResponse.json({ error: "Payment not confirmed for this job" }, { status: 403 });
        }

        // Advance to GENERATING using findByIdAndUpdate to bypass Mongoose cache
        await Job.findByIdAndUpdate(currentJobId, {
            previous_state: job.status,
            status: JobState.PAID_BREAKDOWN_GENERATING,
            state_transitioned_at: new Date(),
        });

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.PAYMENT_CONFIRMED,
            to_state: JobState.PAID_BREAKDOWN_GENERATING,
            triggered_by: "system_generate_paid_route",
        });

        const tempRecord = await Temp.findOne({ job_id: currentJobId });
        if (!tempRecord || !tempRecord.extracted_text) {
            throw new Error("Could not retrieve document text. It may have been auto-deleted.");
        }
        const extractedText = tempRecord.extracted_text;

        const upsells = job.selected_upsells || [];
        let systemPrompt = `You are an expert legal and administrative assistant. 
Your task is to provide a highly detailed, comprehensive breakdown of the provided document.
You MUST reply in JSON format with a single key: "detailed_breakdown".
The value should be formatted in Markdown, using clear headings (e.g., ### Section Name), bullet points, and bold text for emphasis.

Include the following sections as per requirements:
1. **Core Purpose**: A deep dive into exactly what this letter is demanding or stating.
2. **Key Dates & Deadlines**: Highlight any critical timelines.
3. **Required Actions**: Step-by-step instructions on what the user must do next.
4. **Potential Consequences**: What happens if the user ignores this.`;

        if (upsells.includes("legal_formatting")) {
            systemPrompt += `\n\nUPSELL: Legal Formatting. Format the output as a formal legal memorandum using structured legal terminology.`;
        }

        if (upsells.includes("tone_rewrite")) {
            systemPrompt += `\n\nUPSELL: Tone Rewrite. Add a section titled "**Suggested Response Draft**" with a professional template the user can use.`;
        }

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

        // ✅ KEY FIX: Use findByIdAndUpdate to guarantee paid_summary is persisted
        await Job.findByIdAndUpdate(
            currentJobId,
            {
                paid_summary: aiResponse.detailed_breakdown,
                previous_state: JobState.PAID_BREAKDOWN_GENERATING,
                status: JobState.COMPLETED,
                state_transitioned_at: new Date(),
            },
            { new: true }
        );

        await Temp.findOneAndDelete({ job_id: currentJobId });

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

        if (currentJobId) {
            try {
                // ✅ Also use findByIdAndUpdate for the failure case
                await Job.findByIdAndUpdate(currentJobId, {
                    status: JobState.FAILED,
                    state_transitioned_at: new Date(),
                });
            } catch (fallbackError) {
                console.error("Failed to update job status to FAILED", fallbackError);
            }
        }

        return NextResponse.json({ error: "Failed to generate paid summary" }, { status: 500 });
    }
}