import { NextResponse } from "next/server";
import { Category } from "@/models/Category";
import connectDB from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        await connectDB();
        const body = await req.json();
        const { name, slug, base_price, is_active } = body;

        const category = await Category.findByIdAndUpdate(
            params.id,
            { name, slug, base_price, is_active },
            { new: true, runValidators: true }
        );

        if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
        return NextResponse.json({ category });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        await connectDB();
        const category = await Category.findByIdAndDelete(params.id);
        
        if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}