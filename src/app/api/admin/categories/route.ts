import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                created_at: 'asc' 
            }
        });
        
        // MAPPING FIX: Add _id to every category in the array so the frontend doesn't break
        const mappedCategories = categories.map(cat => ({
            ...cat,
            _id: cat.id
        }));
        
        return NextResponse.json({ categories: mappedCategories });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, slug, base_price, is_active } = body;

        const category = await prisma.category.create({
            data: {
                name,
                slug,
                base_price,
                is_active
            }
        });
        
        // MAPPING FIX: Append _id to the newly created category
        return NextResponse.json({ 
            category: { ...category, _id: category.id } 
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: "A category with this slug already exists" }, 
                { status: 400 }
            );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}