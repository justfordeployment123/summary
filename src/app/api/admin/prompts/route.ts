import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Prompt } from "@/models/Prompt";
import { Category } from "@/models/Category";
import mongoose from "mongoose";

// GET /api/admin/prompts
// Returns all prompt templates, enriched with category name
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const typeFilter = searchParams.get("type"); // free | paid | upsell | null
        const categoryId = searchParams.get("categoryId");

        const query: Record<string, unknown> = {};
        if (typeFilter && ["free", "paid", "upsell"].includes(typeFilter)) {
            query.type = typeFilter;
        }
        if (categoryId) {
            query.category_id = categoryId;
        }

        // Fetch prompts and categories in parallel
        const [prompts, categories] = await Promise.all([
            Prompt.find(query).sort({ updated_at: -1 }).lean(),
            Category.find({}).select("_id name").lean(),
        ]);

        // Build category lookup map
        const categoryMap = new Map(categories.map((c: { _id: mongoose.Types.ObjectId; name: string }) => [c._id.toString(), c.name]));

        const enriched = prompts.map(
            (p: {
                _id: mongoose.Types.ObjectId;
                category_id?: mongoose.Types.ObjectId;
                type: string;
                prompt_text: string;
                version: number;
                is_active: boolean;
                updated_at: Date;
            }) => ({
                id: p._id.toString(),
                categoryId: p.category_id ? p.category_id.toString() : null,
                categoryName: p.category_id ? (categoryMap.get(p.category_id.toString()) ?? "Unknown Category") : "Generic",
                type: p.type,
                promptText: p.prompt_text,
                version: p.version,
                isActive: p.is_active,
                updatedAt: p.updated_at,
            }),
        );

        return NextResponse.json({ prompts: enriched });
    } catch (error) {
        console.error("[GET /api/admin/prompts]", error);
        return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
    }
}

// POST /api/admin/prompts
// Creates a new prompt template (version starts at 1)
export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const { categoryId, type, promptText } = body;

        // Validate required fields
        if (!type || !["free", "paid", "upsell"].includes(type)) {
            return NextResponse.json({ error: "Invalid type. Must be free, paid, or upsell." }, { status: 400 });
        }
        if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
            return NextResponse.json({ error: "promptText is required." }, { status: 400 });
        }

        // Validate categoryId if provided
        if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return NextResponse.json({ error: "Invalid categoryId." }, { status: 400 });
        }

        const prompt = await Prompt.create({
            category_id: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
            type,
            prompt_text: promptText.trim(),
            version: 1,
            is_active: true,
            updated_at: new Date(),
        });

        return NextResponse.json(
            {
                prompt: {
                    id: prompt._id.toString(),
                    categoryId: prompt.category_id ? prompt.category_id.toString() : null,
                    type: prompt.type,
                    promptText: prompt.prompt_text,
                    version: prompt.version,
                    isActive: prompt.is_active,
                    updatedAt: prompt.updated_at,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("[POST /api/admin/prompts]", error);
        return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 });
    }
}
