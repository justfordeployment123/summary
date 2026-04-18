import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Create a native Postgres connection pool using your DIRECT_URL
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

// 2. Wrap it in the new Prisma 7 Adapter
const adapter = new PrismaPg(pool);

// 3. Initialize the client using the adapter
const prisma = new PrismaClient({ adapter });

// ... leave the mongoCategories array and the main() function exactly as they are below
const mongoCategories = [
    {
        _id: { $oid: "69b4007d208125dd980131f5" },
        name: "Court/Legal ",
        slug: "court-legal",
        base_price: 1399,
        is_active: true,
        created_at: { $date: "2026-03-13T12:18:05.497Z" },
    },
    {
        _id: { $oid: "69b43f11240e8c4bdf47b417" },
        name: "Government/Tax ",
        slug: "government-tax",
        base_price: 1599,
        is_active: true,
        created_at: { $date: "2026-03-13T16:45:05.599Z" },
    },
    {
        _id: { $oid: "69c72df05e011c5969093eb1" },
        name: "Medical/Health",
        slug: "medical-health",
        base_price: 899,
        is_active: true,
        created_at: { $date: "2026-03-28T01:25:04.109Z" },
    },
    {
        _id: { $oid: "69c72dfa5e011c5969093eb4" },
        name: "Money Owed/Outstanding Payment",
        slug: "money-owed-outstanding-payment",
        base_price: 1299,
        is_active: true,
        created_at: { $date: "2026-03-28T01:25:14.370Z" },
    },
    {
        _id: { $oid: "69c72e1a5e011c5969093eb9" },
        name: "Employment/Work",
        slug: "employment-work",
        base_price: 1199,
        is_active: true,
        created_at: { $date: "2026-03-28T01:25:46.478Z" },
    },
    {
        _id: { $oid: "69c72e205e011c5969093ebc" },
        name: "Insurance",
        slug: "insurance",
        base_price: 1199,
        is_active: true,
        created_at: { $date: "2026-03-28T01:25:52.820Z" },
    },
    {
        _id: { $oid: "69c72e305e011c5969093ebf" },
        name: "Bank/Financial",
        slug: "bank-financial",
        base_price: 1399,
        is_active: true,
        created_at: { $date: "2026-03-28T01:26:08.098Z" },
    },
    {
        _id: { $oid: "69c72e405e011c5969093ec4" },
        name: "Housing/Rent/Mortgage",
        slug: "housing-rent-mortgage",
        base_price: 1499,
        is_active: true,
        created_at: { $date: "2026-03-28T01:26:24.452Z" },
    },
    {
        _id: { $oid: "69c72e455e011c5969093ec7" },
        name: "Utility/Service Provider",
        slug: "utility-service-provider",
        base_price: 799,
        is_active: true,
        created_at: { $date: "2026-03-28T01:26:29.023Z" },
    },
    {
        _id: { $oid: "69c72e4b5e011c5969093eca" },
        name: "Education",
        slug: "education",
        base_price: 899,
        is_active: true,
        created_at: { $date: "2026-03-28T01:26:35.702Z" },
    },
    {
        _id: { $oid: "69c72e515e011c5969093ecd" },
        name: "Benefits ",
        slug: "benefits",
        base_price: 899,
        is_active: true,
        created_at: { $date: "2026-03-28T01:26:41.971Z" },
    },
    {
        _id: { $oid: "69c72e585e011c5969093ed0" },
        name: "Subscription ",
        slug: "subscription",
        base_price: 799,
        is_active: true,
        created_at: { $date: "2026-03-28T01:26:48.630Z" },
    },
    {
        _id: { $oid: "69c72e665e011c5969093ed3" },
        name: "I'm not Sure",
        slug: "i-m-not-sure",
        base_price: 999,
        is_active: true,
        created_at: { $date: "2026-03-28T01:27:02.091Z" },
    },
    {
        _id: { $oid: "69cbf414ef69f38a06d3d088" },
        name: "Parking ",
        slug: "parking",
        base_price: 999,
        is_active: true,
        created_at: { $date: "2026-03-31T16:19:32.470Z" },
    },
];

async function main() {
    console.log("Start seeding categories...");

    // Map the MongoDB JSON to match the Prisma Schema
    const formattedCategories = mongoCategories.map((cat) => ({
        id: cat._id.$oid, // Preserving the exact MongoDB ID
        name: cat.name.trim(), // Cleaning up trailing spaces
        slug: cat.slug,
        base_price: cat.base_price,
        is_active: cat.is_active,
        created_at: new Date(cat.created_at.$date), // Converting to JS Date object
    }));

    // Insert them all into Postgres at once
    const result = await prisma.category.createMany({
        data: formattedCategories,
        skipDuplicates: true, // Prevents crashing if you run the script twice
    });

    console.log(`Successfully inserted ${result.count} categories.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
