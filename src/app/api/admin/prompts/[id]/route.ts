import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Prompt } from "@/models/Prompt";
import { PromptVersion } from "@/models/PromptVersion";
import { Category } from "@/models/Category";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────
// GET /api/admin/prompts/[id]
// Returns a single prompt with category name
// ─────────────────────────────────────────────────────────────
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid prompt ID." }, { status: 400 });
        }

        const prompt = await Prompt.findById(id).lean();
        if (!prompt) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        let categoryName = "Generic";
        if (prompt.category_id) {
            const cat = await Category.findById(prompt.category_id).select("name").lean() as { name: string } | null;
            categoryName = cat?.name ?? "Unknown Category";
        }

        return NextResponse.json({
            prompt: {
                id: (prompt._id as mongoose.Types.ObjectId).toString(),
                categoryId: prompt.category_id ? prompt.category_id.toString() : null,
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
// Updates prompt text → snapshots current version → bumps counter.
// Per requirements: "Prompt versioning: previous versions retained for rollback."
// ─────────────────────────────────────────────────────────────
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid prompt ID." }, { status: 400 });
        }

        const body = await req.json();
        const { promptText } = body;

        if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
            return NextResponse.json({ error: "promptText is required." }, { status: 400 });
        }

        const prompt = await Prompt.findById(id);
        if (!prompt) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        // Snapshot the CURRENT version before overwriting
        await PromptVersion.create({
            prompt_id: prompt._id,
            version: prompt.version,
            prompt_text: prompt.prompt_text,
            updated_at: prompt.updated_at,
        });

        // Bump version and save updated text
        const newVersion = (prompt.version ?? 1) + 1;
        prompt.prompt_text = promptText.trim();
        prompt.version = newVersion;
        prompt.updated_at = new Date();
        await prompt.save();

        return NextResponse.json({
            version: newVersion,
            updatedAt: prompt.updated_at,
        });
    } catch (error) {
        console.error("[PUT /api/admin/prompts/[id]]", error);
        return NextResponse.json({ error: "Failed to update prompt." }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/prompts/[id]
// Lightweight metadata updates: toggle isActive, change type.
// Does NOT bump version — use PUT for prompt text changes.
// ─────────────────────────────────────────────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid prompt ID." }, { status: 400 });
        }

        const body = await req.json();
        const allowedFields: Record<string, unknown> = {};

        if (typeof body.isActive === "boolean") allowedFields.is_active = body.isActive;
        if (body.type && ["free", "paid", "upsell"].includes(body.type)) allowedFields.type = body.type;

        if (Object.keys(allowedFields).length === 0) {
            return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
        }

        allowedFields.updated_at = new Date();

        const updated = await Prompt.findByIdAndUpdate(
            id,
            { $set: allowedFields },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        return NextResponse.json({
            id: (updated._id as mongoose.Types.ObjectId).toString(),
            isActive: updated.is_active,
            type: updated.type,
            version: updated.version,
            updatedAt: updated.updated_at,
        });
    } catch (error) {
        console.error("[PATCH /api/admin/prompts/[id]]", error);
        return NextResponse.json({ error: "Failed to update prompt." }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/prompts/[id]
// Hard-deletes the prompt and its full version history.
// ─────────────────────────────────────────────────────────────
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid prompt ID." }, { status: 400 });
        }

        const deleted = await Prompt.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        // Clean up version history alongside the prompt
        await PromptVersion.deleteMany({ prompt_id: new mongoose.Types.ObjectId(id) });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE /api/admin/prompts/[id]]", error);
        return NextResponse.json({ error: "Failed to delete prompt." }, { status: 500 });
    }
}