import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        // Fetch both settings in a single database query using the 'in' operator
        const settings = await prisma.setting.findMany({
            where: {
                key: {
                    in: ["disclaimer_text", "disclaimer_checkbox_label"]
                }
            }
        });

        // Convert the array of results into a simple key-value dictionary
        const settingsMap = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, any>);

        // Ensure both settings actually exist in the database
        if (!settingsMap["disclaimer_text"] || !settingsMap["disclaimer_checkbox_label"]) {
            return NextResponse.json({ error: "Disclaimer settings not found" }, { status: 404 });
        }

        return NextResponse.json({
            disclaimer_text: settingsMap["disclaimer_text"],
            disclaimer_checkbox_label: settingsMap["disclaimer_checkbox_label"],
        });
    } catch (error) {
        console.error("Error fetching disclaimer:", error);
        return NextResponse.json({ error: "Failed to fetch disclaimer" }, { status: 500 });
    }
}