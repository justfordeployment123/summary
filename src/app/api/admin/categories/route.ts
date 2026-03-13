import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db"; // Adjust path to your DB connect function
import { Category } from "@/models/Category";

export async function GET() {
    try {
        await connectToDatabase();
        const categories = await Category.find({}).sort({ createdAt: 1 });
        return NextResponse.json({ categories });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { name, slug, base_price, is_active } = body;

        const category = await Category.create({ name, slug, base_price, is_active });
        return NextResponse.json({ category });
    } catch (error: any) {
        // Handle duplicate slug error
        if (error.code === 11000) {
            return NextResponse.json({ error: "A category with this slug already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
