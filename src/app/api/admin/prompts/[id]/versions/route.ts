import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/admin/prompts/[id]/versions
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // We can fetch the prompt and all its historical versions in a single query
        const prompt = await prisma.prompt.findUnique({
            where: { id },
            select: {
                version: true,
                prompt_text: true,
                updated_at: true,
                // Join the versions table natively
                versions: {
                    select: {
                        version: true,
                        prompt_text: true,
                        updated_at: true,
                    },
                    orderBy: { version: 'desc' } // Prisma handles the sorting automatically
                }
            }
        });

        if (!prompt) {
            return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
        }

        // Current version entry (always first in the list)
        const currentEntry = {
            version: prompt.version,
            promptText: prompt.prompt_text,
            updatedAt: prompt.updated_at,
        };

        // All archived snapshots (already sorted by Prisma)
        const archivedEntries = prompt.versions.map((v) => ({
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