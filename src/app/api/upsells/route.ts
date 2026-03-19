// app/api/upsells/route.ts
import { NextResponse } from "next/server";
// Adjust the paths to your DB connection and Model
import connectDB from "@/lib/db";
import Upsell from "@/models/Upsell";

export async function GET() {
    try {
        await connectDB();

        // Fetch upsells.
        // We use .lean() to convert Mongoose documents to plain JavaScript objects.
        // This automatically turns the 'category_prices' Map into a standard Record object.
        const upsells = await Upsell.find({ is_active: true }).lean();

        return NextResponse.json({ upsells }, { status: 200 });
    } catch (error: any) {
        console.error("Error fetching upsells:", error);
        return NextResponse.json({ error: "Failed to fetch upsells" }, { status: 500 });
    }
}
