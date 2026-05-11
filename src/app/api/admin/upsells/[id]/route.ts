import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Unwrap the promise to get the ID (Next.js 15+ standard)
        const { id } = await params;

        const body = await req.json();
        const { name, description, is_active, category_prices } = body;

        const upsell = await prisma.upsell.update({
            where: { id },
            data: {
                name,
                description,
                is_active,
                category_prices,
            },
        });

        // MAPPING FIX: Append _id to the updated upsell
        return NextResponse.json({
            upsell: { ...upsell, _id: upsell.id },
        });
    } catch (error: any) {
        // Catch if the ID doesn't exist
        if (error.code === "P2025") {
            return NextResponse.json({ error: "Upsell not found" }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Unwrap the promise to get the ID
        const { id } = await params;

        await prisma.upsell.delete({
            where: { id },
        });

        // No mapping needed here since we only return a boolean success state
        return NextResponse.json({ success: true });
    } catch (error: any) {
        // Catch if the ID doesn't exist
        if (error.code === "P2025") {
            return NextResponse.json({ error: "Upsell not found" }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
