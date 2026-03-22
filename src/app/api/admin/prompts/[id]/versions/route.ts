import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Prompt } from "@/models/Prompt";
import { PromptVersion } from "@/models/PromptVersion";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────
// GET /api/admin/prompts/[id]/versions
// Returns the full version history for a prompt, newest first.
// Includes the CURRENT live version as the first entry so the
// admin sees a complete timeline in one request.
// ─────────────────────────────────────────────────────────────
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid prompt ID." }, { status: 400 });
        }

        const promptId = new mongoose.Types.ObjectId(id);

        // Fetch current live prompt + all archived snapshots in parallel
        const [prompt, archivedVersions] = await Promise.all([
            Prompt.findById(promptId)
                .select("version prompt_text updated_at")
                .lean(),
            PromptVersion.find({ prompt_id: promptId })
                .sort({ version: -1 })
                .lean(),
        ]);

        if (!prompt) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        // Current version entry (always first in the list)
        const currentEntry = {
            version: prompt.version,
            promptText: prompt.prompt_text,
            updatedAt: prompt.updated_at,
        };

        // All archived snapshots (already sorted descending by version)
        const archivedEntries = archivedVersions.map((v) => ({
            version: v.version,
            promptText: v.prompt_text,
            updatedAt: v.updated_at,
        }));

        return NextResponse.json({
            versions: [currentEntry, ...archivedEntries],
        });
    } catch (error) {
        console.error("[GET /api/admin/prompts/[id]/versions]", error);
        return NextResponse.json({ error: "Failed to fetch version history." }, { status: 500 });
    }
}