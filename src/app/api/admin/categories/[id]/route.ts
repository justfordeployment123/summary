import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await req.json();
        const { name, slug, base_price, is_active } = body;

        const { id } = await params;

        const category = await prisma.category.update({
            where: { id },
            data: { name, slug, base_price, is_active }
        });

        // MAPPING FIX: Append _id to the updated category
        return NextResponse.json({ 
            category: { ...category, _id: category.id } 
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "A category with this slug already exists" }, { status: 400 });
        }
        
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        await prisma.category.delete({
            where: { id }
        });
        
        // No mapping needed here since we only return a boolean success state
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}