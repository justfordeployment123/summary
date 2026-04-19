import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        // Fetch active categories, select specific fields, and sort alphabetically
        const categories = await prisma.category.findMany({
            where: {
                is_active: true,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                base_price: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        // MAPPING FIX: Append _id so frontend components mapping over cat._id don't break
        const mappedCategories = categories.map((cat) => ({
            ...cat,
            _id: cat.id,
        }));

        return NextResponse.json({ categories: mappedCategories }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch categories:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}
