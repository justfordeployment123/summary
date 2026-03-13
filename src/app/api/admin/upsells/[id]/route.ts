import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Upsell from "@/models/Upsell";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { name, description, is_active, category_prices } = body;

        const upsell = await Upsell.findByIdAndUpdate(
            params.id,
            { name, description, is_active, category_prices },
            { new: true, runValidators: true },
        );

        if (!upsell) return NextResponse.json({ error: "Upsell not found" }, { status: 404 });
        return NextResponse.json({ upsell });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        await connectToDatabase();
        const upsell = await Upsell.findByIdAndDelete(params.id);

        if (!upsell) return NextResponse.json({ error: "Upsell not found" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
