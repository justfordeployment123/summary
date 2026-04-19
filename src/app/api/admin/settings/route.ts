// // src/app/api/admin/settings/route.ts

// import { NextResponse } from "next/server";
// import connectToDatabase from "@/lib/db";
// import { Setting } from "@/models/Setting";

// const DEFAULT_SETTINGS = {
//     ocr_confidence_flag_threshold:   85,
//     ocr_confidence_reject_threshold: 70,
//     openai_model:                    "gpt-4.1",
//     openai_input_word_limit:         1200,
//     openai_max_input_tokens:         4000,
//     openai_max_output_tokens:        1500,
//     openai_monthly_token_cap:        1000000,
//     openai_monthly_cost_cap:         5000,
//     openai_alert_threshold_percent:  80,
//     openai_alert_email:              "",   // Email notified when usage crosses the alert threshold
//     download_link_expiry_hours:      72,
//     file_retention_hours:            24,
//     stuck_job_timeout_minutes:       5,
//     max_regeneration_attempts:       3,
//     disclaimer_text:
//         "This service provides an automated summary for general informational purposes only. It does not constitute legal, financial, medical, or professional advice. You should always seek advice from a qualified professional before acting on any document.",
//     disclaimer_checkbox_label:
//         "I understand this is an automated technology summary and not professional advice.",
//     // §21 — "Job metadata: 12 months. Admin-triggered or scheduled cleanup. Configurable."
//     job_metadata_retention_days: 365,
// };

// export async function GET() {
//     try {
//         await connectToDatabase();

//         const dbSettings = await Setting.find({}).lean<{ key: string; value: any }[]>();

//         const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };
//         dbSettings.forEach((s) => { settingsMap[s.key] = s.value; });

//         return NextResponse.json({ settings: settingsMap });
//     } catch (error: any) {
//         return NextResponse.json({ error: error.message }, { status: 500 });
//     }
// }

// export async function PUT(req: Request) {
//     try {
//         await connectToDatabase();

//         const { key, value } = await req.json();

//         if (!key || value === undefined) {
//             return NextResponse.json({ error: "Key and value are required." }, { status: 400 });
//         }

//         const updated = await Setting.findOneAndUpdate(
//             { key },
//             { value },
//             { upsert: true, new: true, runValidators: true },
//         );

//         return NextResponse.json({ setting: updated });
//     } catch (error: any) {
//         return NextResponse.json({ error: error.message }, { status: 500 });
//     }
// }
// src/app/api/admin/settings/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_SETTINGS = {
    ocr_confidence_flag_threshold: 85,
    ocr_confidence_reject_threshold: 70,
    openai_model: "gpt-4.1",
    openai_input_word_limit: 1200,
    openai_max_input_tokens: 4000,
    openai_max_output_tokens: 1500,
    openai_monthly_token_cap: 1000000,
    openai_monthly_cost_cap: 5000,
    openai_alert_threshold_percent: 80,
    openai_alert_email: "", // Email notified when usage crosses the alert threshold
    download_link_expiry_hours: 72,
    file_retention_hours: 24,
    stuck_job_timeout_minutes: 5,
    max_regeneration_attempts: 3,
    disclaimer_text:
        "This service provides an automated summary for general informational purposes only. It does not constitute legal, financial, medical, or professional advice. You should always seek advice from a qualified professional before acting on any document.",
    disclaimer_checkbox_label: "I understand this is an automated technology summary and not professional advice.",
    // §21 — "Job metadata: 12 months. Admin-triggered or scheduled cleanup. Configurable."
    job_metadata_retention_days: 365,
};

export async function GET() {
    try {
        const dbSettings = await prisma.setting.findMany();

        // Merge defaults with whatever is in the database
        const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };
        dbSettings.forEach((s) => {
            settingsMap[s.key] = s.value;
        });

        // The frontend expects a dictionary/map here, so no _id mapping is needed for the GET route
        return NextResponse.json({ settings: settingsMap });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { key, value } = await req.json();

        if (!key || value === undefined) {
            return NextResponse.json({ error: "Key and value are required." }, { status: 400 });
        }

        // Prisma's Upsert requires explicitly stating what to do if it finds the record (update)
        // vs what to do if it doesn't exist yet (create).
        const updated = await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: {
                key,
                value,
            },
        });

        // MAPPING FIX: Append _id just in case the frontend relies on it after a save
        return NextResponse.json({
            setting: { ...updated, _id: updated.id },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
