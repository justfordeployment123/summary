import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Setting } from "@/models/Setting";

// Default system settings based on the Requirements Document
const DEFAULT_SETTINGS = {
    ocr_confidence_flag_threshold: 85,
    ocr_confidence_reject_threshold: 70,
    openai_model: "gpt-4.1",
    openai_input_word_limit: 1200,
    openai_max_input_tokens: 4000,
    openai_max_output_tokens: 1500,
    openai_monthly_token_cap: 1000000,
    openai_monthly_cost_cap: 5000, // in pence/cents
    openai_alert_threshold_percent: 80,
    download_link_expiry_hours: 72,
    file_retention_hours: 24,
    stuck_job_timeout_minutes: 5,
    max_regeneration_attempts: 3,
    disclaimer_text:
        "This service provides an AI-generated summary for general informational purposes only. It does not constitute legal, financial, medical, or professional advice. You should always seek advice from a qualified professional before acting on any document.",
    disclaimer_checkbox_label: "I understand this is an AI-generated summary and not professional advice.",
};

export async function GET() {
    try {
        await connectToDatabase();

        // Fetch all settings from DB
        const dbSettings = await Setting.find({});

        // Start with defaults, then override with whatever is in the DB
        const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };

        dbSettings.forEach((setting) => {
            settingsMap[setting.key] = setting.value;
        });

        return NextResponse.json({ settings: settingsMap });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { key, value } = body;

        if (!key || value === undefined) {
            return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
        }

        // Upsert: Update if it exists, create if it doesn't
        // Using returnDocument: 'after' to comply with Next 15 / Mongoose updates
        const updatedSetting = await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, returnDocument: "after", runValidators: true });

        return NextResponse.json({ setting: updatedSetting });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
