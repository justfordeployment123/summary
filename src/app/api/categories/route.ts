import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Category } from "@/models/Category";

export async function GET() {
    try {
        await dbConnect();

        // Only fetch active categories and sort them alphabetically
        const categories = await Category.find({ is_active: true }).select("_id name slug base_price").sort({ name: 1 }).lean();

        return NextResponse.json({ categories }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch categories:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}
