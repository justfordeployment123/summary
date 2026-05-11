import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PromptType } from "@prisma/client";

// GET /api/admin/prompts
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const typeFilter = searchParams.get("type"); 
        const categoryId = searchParams.get("categoryId");

        // Build the Prisma "where" clause dynamically
        const whereClause: any = {};
        
        if (typeFilter && ["free", "paid", "upsell"].includes(typeFilter)) {
            whereClause.type = typeFilter as PromptType;
        }
        if (categoryId) {
            whereClause.category_id = categoryId;
        }

        // Fetch prompts AND join the category name in a single query
        const prompts = await prisma.prompt.findMany({
            where: whereClause,
            orderBy: { updated_at: 'desc' },
            include: {
                category: {
                    select: { name: true } // Only pull the name from the Category table
                }
            }
        });

        // Map it to exactly match the frontend interface you previously used
        const enriched = prompts.map((p) => ({
            id: p.id,
            categoryId: p.category_id,
            categoryName: p.category?.name || "Generic", // Fallback if no category is attached
            type: p.type,
            promptText: p.prompt_text,
            version: p.version,
            isActive: p.is_active,
            updatedAt: p.updated_at,
        }));

        return NextResponse.json({ prompts: enriched });
    } catch (error) {
        console.error("[GET /api/admin/prompts]", error);
        return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
    }
}

// POST /api/admin/prompts
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { categoryId, type, promptText } = body;

        // Validate required fields
        if (!type || !["free", "paid", "upsell"].includes(type)) {
            return NextResponse.json({ error: "Invalid type. Must be free, paid, or upsell." }, { status: 400 });
        }
        if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
            return NextResponse.json({ error: "promptText is required." }, { status: 400 });
        }

        // Prisma automatically handles the UUID format, so we don't need mongoose.Types.ObjectId.isValid
        // If categoryId is an invalid UUID, Prisma will automatically throw an error during insertion.

        const prompt = await prisma.prompt.create({
            data: {
                category_id: categoryId || null, // Ensure empty strings become null
                type: type as PromptType,
                prompt_text: promptText.trim(),
                version: 1,
                is_active: true,
                // Prisma automatically handles updated_at via @updatedAt in the schema
            }
        });

        return NextResponse.json(
            {
                prompt: {
                    id: prompt.id,
                    categoryId: prompt.category_id,
                    type: prompt.type,
                    promptText: prompt.prompt_text,
                    version: prompt.version,
                    isActive: prompt.is_active,
                    updatedAt: prompt.updated_at,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[POST /api/admin/prompts]", error);
        
        // Handle Foreign Key constraint failure (e.g., if they pass a Category ID that doesn't exist)
        if (error.code === 'P2003') {
            return NextResponse.json({ error: "Invalid categoryId. Category does not exist." }, { status: 400 });
        }
        
        return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 });
    }
}