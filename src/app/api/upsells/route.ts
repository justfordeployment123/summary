// src/app/api/upsells/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        // Fetch only active upsells
        const upsells = await prisma.upsell.findMany({
            where: {
                is_active: true,
            },
        });

        // MAPPING FIX: Append _id so frontend components don't break
        const mappedUpsells = upsells.map((upsell) => ({
            ...upsell,
            _id: upsell.id,
        }));

        return NextResponse.json({ upsells: mappedUpsells }, { status: 200 });
    } catch (error: any) {
        console.error("Error fetching upsells:", error);
        return NextResponse.json({ error: "Failed to fetch upsells" }, { status: 500 });
    }
}
