import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Upsell from "@/models/Upsell";

export async function GET() {
    try {
        await connectToDatabase();
        const upsells = await Upsell.find({}).sort({ createdAt: 1 });
        return NextResponse.json({ upsells });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { name, description, is_active, category_prices } = body;

        const upsell = await Upsell.create({
            name,
            description,
            is_active,
            category_prices,
        });

        return NextResponse.json({ upsell });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
