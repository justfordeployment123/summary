import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Upsell from "@/models/Upsell";

// Note the change in the type of params to Promise<{ id: string }>
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        
        // 1. Await the params object (Next.js 15 requirement)
        const { id } = await params; 
        
        const body = await req.json();
        const { name, description, is_active, category_prices } = body;

        const upsell = await Upsell.findByIdAndUpdate(
            id,
            { name, description, is_active, category_prices },
            // 2. Fix the Mongoose warning by using returnDocument instead of new: true
            { returnDocument: 'after', runValidators: true } 
        );

        if (!upsell) return NextResponse.json({ error: "Upsell not found" }, { status: 404 });
        return NextResponse.json({ upsell });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        
        // 1. Await the params object here too
        const { id } = await params;

        const upsell = await Upsell.findByIdAndDelete(id);
        
        if (!upsell) return NextResponse.json({ error: "Upsell not found" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}