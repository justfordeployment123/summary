import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const upsells = await prisma.upsell.findMany({
            orderBy: {
                createdAt: 'asc'
            }
        });

        // MAPPING FIX: Add _id to every upsell so the frontend doesn't break
        const mappedUpsells = upsells.map(upsell => ({
            ...upsell,
            _id: upsell.id
        }));

        return NextResponse.json({ upsells: mappedUpsells });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, is_active, category_prices } = body;

        const upsell = await prisma.upsell.create({
            data: {
                name,
                description,
                is_active,
                // Prisma takes the JS object directly and stores it as JSON
                category_prices: category_prices || {} 
            }
        });

        // MAPPING FIX: Append _id to the newly created upsell
        return NextResponse.json({ 
            upsell: { ...upsell, _id: upsell.id } 
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}