// src/app/api/download/[format]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer } from "docx";

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPIRY_HOURS = 72;
const DISCLAIMER =
    "This document is an AI-generated summary for informational purposes only and does not constitute legal, financial, or professional advice.";

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ format: string }> }) {
    try {
        await connectToDatabase();

        const resolvedParams = await params;
        const format = resolvedParams.format.toLowerCase();

        const jobId = req.nextUrl.searchParams.get("job_id");
        const token = req.nextUrl.searchParams.get("token");

        if (!jobId || !token) {
            return NextResponse.json({ error: "Missing job ID or access token." }, { status: 400 });
        }

        if (!["pdf", "docx", "txt"].includes(format)) {
            return NextResponse.json({ error: "Invalid format requested." }, { status: 400 });
        }

        // ── 1. Retrieve job & verify token [cite: 288] ──
        const job = await Job.findOne({ _id: jobId, access_token: token }).lean<any>();

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        // ── 2. Enforce Paid Content Guard ──
        if (job.status !== "COMPLETED" || !job.stripe_payment_intent_id) {
            return NextResponse.json({ error: "Detailed breakdown not available or payment not confirmed." }, { status: 403 });
        }

        // ── 3. Enforce 72-hour Expiry [cite: 289] ──
        const processedAt = new Date(job.processed_at).getTime();
        const now = Date.now();
        const hoursSinceCompletion = (now - processedAt) / (1000 * 60 * 60);

        if (hoursSinceCompletion > EXPIRY_HOURS) {
            return NextResponse.json({ error: "Download link has expired. Links expire 72 hours after completion." }, { status: 410 });
        }

        const breakdownText = job.paid_summary || "No breakdown available.";
        const referenceId = job.reference_id || String(job._id);
        const dateStr = new Date(job.processed_at).toLocaleDateString("en-GB");

        // ── 4. Generate Output based on Format ──
        if (format === "txt") {
            const txtContent = `ExplainMyLetter Breakdown\nReference: ${referenceId}\nDate: ${dateStr}\n\n${breakdownText}\n\n---\n${DISCLAIMER}`;
            return new NextResponse(txtContent, {
                headers: {
                    "Content-Type": "text/plain",
                    "Content-Disposition": `attachment; filename="breakdown_${referenceId}.txt"`,
                },
            });
        }

        if (format === "pdf") {
            const pdfBuffer = await generatePDF(breakdownText, referenceId, dateStr);
            // Wrap the Buffer in a Uint8Array to satisfy TypeScript
            return new NextResponse(new Uint8Array(pdfBuffer), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="breakdown_${referenceId}.pdf"`,
                },
            });
        }
        if (format === "docx") {
            const docxBuffer = await generateDOCX(breakdownText, referenceId, dateStr);
            // Wrap the Buffer in a Uint8Array to satisfy TypeScript
            return new NextResponse(new Uint8Array(docxBuffer), {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "Content-Disposition": `attachment; filename="breakdown_${referenceId}.docx"`,
                },
            });
        }
    } catch (error: any) {
        console.error("[download/route]", error);
        return NextResponse.json({ error: "Failed to generate document." }, { status: 500 });
    }
}

// ─── Document Generators ─────────────────────────────────────────────────────

async function generatePDF(text: string, referenceId: string, dateStr: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, bufferPages: true });
            const buffers: Buffer[] = [];

            doc.on("data", (chunk) => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));

            // Header/Branding [cite: 285]
            doc.fontSize(20).fillColor("#0d9488").text("ExplainMyLetter Breakdown", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor("#64748b").text(`Ref: ${referenceId}`, { align: "right" });
            doc.text(`Date: ${dateStr}`, { align: "right" });
            doc.moveDown(2);

            // Body
            doc.fontSize(11).fillColor("#334155").text(text, {
                align: "left",
                lineGap: 4,
            });

            // Footer on every page [cite: 164, 165, 285]
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8)
                    .fillColor("#94a3b8")
                    .text(DISCLAIMER, 50, doc.page.height - 50, {
                        align: "center",
                        width: doc.page.width - 100,
                    });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

async function generateDOCX(text: string, referenceId: string, dateStr: string): Promise<Buffer> {
    const paragraphs = text.split("\n").map((line) => {
        return new Paragraph({
            children: [new TextRun({ text: line, size: 22 })], // size is in half-points (22 = 11pt)
            spacing: { after: 200 },
        });
    });

    const doc = new Document({
        sections: [
            {
                properties: {},
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({ text: `ExplainMyLetter | Ref: ${referenceId} | Date: ${dateStr}`, color: "64748b", size: 18 }),
                                ],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: DISCLAIMER, color: "94a3b8", size: 16 })],
                            }),
                        ],
                    }),
                },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        children: [new TextRun({ text: "ExplainMyLetter Breakdown", bold: true, size: 36, color: "0d9488" })],
                    }),
                    ...paragraphs,
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    return Buffer.from(buffer);
}
