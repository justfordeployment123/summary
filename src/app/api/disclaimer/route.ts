import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Setting } from "@/models/Setting";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const [disclaimerText, checkboxLabel] = await Promise.all([
            Setting.findOne({ key: "disclaimer_text" }),
            Setting.findOne({ key: "disclaimer_checkbox_label" }),
        ]);

        if (!disclaimerText || !checkboxLabel) {
            return NextResponse.json({ error: "Disclaimer settings not found" }, { status: 404 });
        }

        return NextResponse.json({
            disclaimer_text: disclaimerText.value,
            disclaimer_checkbox_label: checkboxLabel.value,
        });
    } catch (error) {
        console.error("Error fetching disclaimer:", error);
        return NextResponse.json({ error: "Failed to fetch disclaimer" }, { status: 500 });
    }
}
