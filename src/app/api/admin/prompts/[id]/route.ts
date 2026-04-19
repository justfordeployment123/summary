import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PromptType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// GET /api/admin/prompts/[id]
// Returns a single prompt with category name natively joined
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Fetch prompt and join the category name in one query
        const prompt = await prisma.prompt.findUnique({
            where: { id },
            include: {
                category: {
                    select: { name: true }
                }
            }
        });

        if (!prompt) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        // Map category name exactly how the frontend expects it
        const categoryName = prompt.category?.name ?? (prompt.category_id ? "Unknown Category" : "Generic");

        return NextResponse.json({
            prompt: {
                id: prompt.id,
                categoryId: prompt.category_id,
                categoryName,
                type: prompt.type,
                promptText: prompt.prompt_text,
                version: prompt.version,
                isActive: prompt.is_active,
                updatedAt: prompt.updated_at,
            },
        });
    } catch (error) {
        console.error("[GET /api/admin/prompts/[id]]", error);
        return NextResponse.json({ error: "Failed to fetch prompt." }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/prompts/[id]
// Snapshots current version into PromptVersion -> updates text -> bumps counter.
// Protected by a database transaction.
// ─────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { promptText } = body;

        if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
            return NextResponse.json({ error: "promptText is required." }, { status: 400 });
        }

        // 1. Fetch the CURRENT state so we can snapshot it
        const currentPrompt = await prisma.prompt.findUnique({
            where: { id }
        });

        if (!currentPrompt) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        const newVersion = currentPrompt.version + 1;

        // 2. Execute Snapshot and Update inside a Transaction to guarantee data integrity
        const [_, updatedPrompt] = await prisma.$transaction([
            // Action A: Create the historical snapshot
            prisma.promptVersion.create({
                data: {
                    prompt_id: currentPrompt.id,
                    version: currentPrompt.version,
                    prompt_text: currentPrompt.prompt_text,
                    updated_at: currentPrompt.updated_at,
                }
            }),
            // Action B: Update the live prompt
            prisma.prompt.update({
                where: { id },
                data: {
                    prompt_text: promptText.trim(),
                    version: newVersion,
                    // Prisma automatically sets updated_at via @updatedAt in the schema
                }
            })
        ]);

        return NextResponse.json({
            version: updatedPrompt.version,
            updatedAt: updatedPrompt.updated_at,
        });
    } catch (error) {
        console.error("[PUT /api/admin/prompts/[id]]", error);
        return NextResponse.json({ error: "Failed to update prompt." }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/prompts/[id]
// Lightweight metadata updates: toggle isActive, change type.
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        
        const allowedFields: Record<string, any> = {};

        if (typeof body.isActive === "boolean") allowedFields.is_active = body.isActive;
        if (body.type && ["free", "paid", "upsell"].includes(body.type)) allowedFields.type = body.type as PromptType;

        if (Object.keys(allowedFields).length === 0) {
            return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
        }

        const updated = await prisma.prompt.update({
            where: { id },
            data: allowedFields
        });

        return NextResponse.json({
            id: updated.id,
            isActive: updated.is_active,
            type: updated.type,
            version: updated.version,
            updatedAt: updated.updated_at,
        });
    } catch (error: any) {
        console.error("[PATCH /api/admin/prompts/[id]]", error);
        
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }
        
        return NextResponse.json({ error: "Failed to update prompt." }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/prompts/[id]
// Hard-deletes the prompt. The PromptVersion history is auto-deleted 
// by Postgres via the `onDelete: Cascade` rule in the Prisma schema.
// ─────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        await prisma.prompt.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[DELETE /api/admin/prompts/[id]]", error);
        
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }
        
        return NextResponse.json({ error: "Failed to delete prompt." }, { status: 500 });
    }
}