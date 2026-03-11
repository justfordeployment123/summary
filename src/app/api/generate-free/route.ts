import { NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import { Job } from "@/models/Job";
import { JobState } from "@/types/job";
import { JobStateLog } from "@/models/JobStateLog";

// Initialize OpenAI
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

        // 1. Construct the Strict Prompt
        const systemPrompt = `You are a legal and administrative assistant. 
Your job is to read complex letters and summarize them for everyday people in plain, simple English.
You MUST reply in JSON format with exactly two keys: "summary" and "urgency".
- "summary": A plain-English explanation of the text. It MUST be between 100 and 130 words.
- "urgency": Rate the urgency of the document as exactly one of these: "Low", "Medium", "High", or "Critical".`;

        // 2. Call OpenAI API (Using GPT-4o for speed and accuracy)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Here is the document text:\n\n${extractedText}` },
            ],
            temperature: 0.3, // Low temperature for more factual, less creative outputs
        });

        // 3. Parse the JSON response
        const aiResponse = JSON.parse(completion.choices[0].message.content!);

        // 4. Save the summary to the database and update state
        job.free_summary = aiResponse.summary;
        job.urgency_indicator = aiResponse.urgency;
        job.previous_state = job.status;
        job.status = JobState.FREE_SUMMARY_COMPLETE;
        job.state_transitioned_at = new Date();
        await job.save();

        await JobStateLog.create({
            job_id: job._id,
            from_state: JobState.FREE_SUMMARY_GENERATING,
            to_state: JobState.FREE_SUMMARY_COMPLETE,
            triggered_by: "system_generate_route",
        });

        // 5. Return the payload to the frontend
        return NextResponse.json(
            {
                message: "Summary generated successfully",
                summary: aiResponse.summary,
                urgency: aiResponse.urgency,
            },
            { status: 200 },
        );
    } catch (error: any) {
        console.error("Generation Error:", error);
        return NextResponse.json(
            {
                error: "Failed to generate summary",
                details: error.message,
            },
            { status: 500 },
        );
    }
}
