// src/app/api/download/[format]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, BorderStyle } from "docx";
// import path from "path"; // Uncomment if using the custom font fallback below

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPIRY_HOURS = 72;
const DISCLAIMER =
    "This document is an AI-generated summary for informational purposes only and does not constitute legal, financial, or professional advice.";

// ─── GET handler ─────────────────────────────────────────────────────────────

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

        // ── 1. Retrieve job & verify token ──
        const job = await Job.findOne({ _id: jobId, access_token: token }).lean<any>();

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        // ── 2. Enforce paid content guard ──
        if (job.status !== "COMPLETED" || !job.stripe_payment_intent_id) {
            return NextResponse.json({ error: "Detailed breakdown not available or payment not confirmed." }, { status: 403 });
        }

        // ── 3. Enforce 72-hour expiry ──
        const processedAt = new Date(job.processed_at).getTime();
        const hoursSinceCompletion = (Date.now() - processedAt) / (1000 * 60 * 60);

        if (hoursSinceCompletion > EXPIRY_HOURS) {
            return NextResponse.json({ error: "Download link has expired. Links expire 72 hours after completion." }, { status: 410 });
        }

        const breakdownText: string = job.paid_summary || "No breakdown available.";
        const referenceId: string = job.reference_id || String(job._id);
        const dateStr: string = new Date(job.processed_at).toLocaleDateString("en-GB");

        // ── 4. Generate by format ──

        if (format === "txt") {
            const txtContent = [
                "ExplainMyLetter Breakdown",
                `Reference: ${referenceId}`,
                `Date: ${dateStr}`,
                "",
                breakdownText,
                "",
                "---",
                DISCLAIMER,
            ].join("\n");

            return new NextResponse(txtContent, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Content-Disposition": `attachment; filename="breakdown_${referenceId}.txt"`,
                },
            });
        }

        if (format === "pdf") {
            const pdfBuffer = await generatePDF(breakdownText, referenceId, dateStr);
            return new NextResponse(new Uint8Array(pdfBuffer), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="breakdown_${referenceId}.pdf"`,
                },
            });
        }

        if (format === "docx") {
            const docxBuffer = await generateDOCX(breakdownText, referenceId, dateStr);
            return new NextResponse(new Uint8Array(docxBuffer), {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "Content-Disposition": `attachment; filename="breakdown_${referenceId}.docx"`,
                },
            });
        }

        return NextResponse.json({ error: "Unhandled format." }, { status: 400 });
    } catch (error) {
        console.error("[download/route]", error);
        return NextResponse.json({ error: "Failed to generate document." }, { status: 500 });
    }
}

// ─── Shared markdown line parser ──────────────────────────────────────────────

function stripInline(line: string): string {
    return line
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1");
}

function parseInlineDocx(line: string, baseSize = 22): TextRun[] {
    const runs: TextRun[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
        if (match.index > last) {
            runs.push(new TextRun({ text: line.slice(last, match.index), size: baseSize }));
        }
        if (match[1] !== undefined) {
            runs.push(new TextRun({ text: match[1], bold: true, size: baseSize }));
        } else if (match[2] !== undefined) {
            runs.push(new TextRun({ text: match[2], italics: true, size: baseSize }));
        }
        last = match.index + match[0].length;
    }

    if (last < line.length) {
        runs.push(new TextRun({ text: line.slice(last), size: baseSize }));
    }

    return runs.length > 0 ? runs : [new TextRun({ text: line, size: baseSize })];
}

// ─── PDF generator ────────────────────────────────────────────────────────────

function generatePDF(text: string, referenceId: string, dateStr: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, autoFirstPage: false, size: "A4" });
            
            // OPTIONAL FALLBACK: If the next.config.js fix fails on your host, uncomment this block
            // and place a font file like 'Roboto-Regular.ttf' inside a `public/fonts` directory.
            /*
            const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
            doc.registerFont('CustomFont', fontPath);
            const defaultFont = 'CustomFont';
            */
            // If using the fallback, replace all instances of "Helvetica" below with defaultFont
            
            const chunks: Buffer[] = [];

            doc.on("data", (chunk: Buffer) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            // ── Footer on every page ──
            let writingFooter = false;
            doc.on("pageAdded", () => {
                if (writingFooter) return;
                writingFooter = true;

                // 1. Save cursor position and temporarily remove the bottom margin
                const originalX = doc.x;
                const originalY = doc.y;
                const originalBottomMargin = doc.page.margins.bottom;
                doc.page.margins.bottom = 0;

                // 2. Write the footer at the bottom
                doc.fontSize(7)
                    .fillColor("#94a3b8")
                    .font("Helvetica")
                    .text(DISCLAIMER, 50, doc.page.height - 45, {
                        width: doc.page.width - 100,
                        align: "center",
                        lineBreak: false,
                    });

                // 3. Restore the cursor and the margin so normal content writes correctly
                doc.x = originalX;
                doc.y = originalY;
                doc.page.margins.bottom = originalBottomMargin;

                writingFooter = false;
            });

            doc.addPage();

            // ── Title block ──
            doc.fontSize(18).fillColor("#0d9488").font("Helvetica-Bold").text("ExplainMyLetter Breakdown", { align: "center" });

            doc.moveDown(0.4);
            doc.fontSize(9).fillColor("#64748b").font("Helvetica").text(`Ref: ${referenceId}   |   Date: ${dateStr}`, { align: "right" });

            doc.moveDown(0.5);
            doc.moveTo(50, doc.y)
                .lineTo(doc.page.width - 50, doc.y)
                .strokeColor("#e2e8f0")
                .lineWidth(1)
                .stroke();
            doc.moveDown(1);

            // ── Render markdown lines ──
            // Trim the entire text before splitting to avoid trailing empty lines causing blank pages
            const lines = text.trim().split("\n");
            for (const raw of lines) {
                const line = raw.trimEnd();

                if (!line) {
                    doc.moveDown(0.4);
                    continue;
                }

                if (line.startsWith("## ")) {
                    doc.moveDown(0.6);
                    doc.fontSize(13)
                        .fillColor("#0F233F")
                        .font("Helvetica-Bold")
                        .text(stripInline(line.slice(3)));
                    doc.moveDown(0.3);
                    continue;
                }

                if (line.startsWith("### ")) {
                    doc.moveDown(0.4);
                    doc.fontSize(11)
                        .fillColor("#12A1A6")
                        .font("Helvetica-Bold")
                        .text(stripInline(line.slice(4)));
                    doc.moveDown(0.2);
                    continue;
                }

                if (line.startsWith("# ")) {
                    doc.moveDown(0.6);
                    doc.fontSize(15)
                        .fillColor("#0F233F")
                        .font("Helvetica-Bold")
                        .text(stripInline(line.slice(2)));
                    doc.moveDown(0.3);
                    continue;
                }

                if (line.startsWith("- ") || line.startsWith("* ")) {
                    doc.fontSize(10)
                        .fillColor("#334155")
                        .font("Helvetica")
                        .text("• " + stripInline(line.slice(2)), { indent: 12 });
                    continue;
                }

                const olMatch = line.match(/^(\d+)\.\s+(.*)/);
                if (olMatch) {
                    doc.fontSize(10)
                        .fillColor("#334155")
                        .font("Helvetica")
                        .text(`${olMatch[1]}. ${stripInline(olMatch[2])}`, { indent: 12 });
                    continue;
                }

                if (/^---+$/.test(line.trim())) {
                    doc.moveDown(0.3);
                    doc.moveTo(50, doc.y)
                        .lineTo(doc.page.width - 50, doc.y)
                        .strokeColor("#e2e8f0")
                        .lineWidth(0.5)
                        .stroke();
                    doc.moveDown(0.3);
                    continue;
                }

                doc.fontSize(10).fillColor("#334155").font("Helvetica").text(stripInline(line));
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ─── DOCX generator ───────────────────────────────────────────────────────────

async function generateDOCX(text: string, referenceId: string, dateStr: string): Promise<Buffer> {
    const children: Paragraph[] = [];
    const lines = text.split("\n");

    for (const raw of lines) {
        const line = raw.trimEnd();

        if (!line) {
            children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
            continue;
        }

        if (line.startsWith("## ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: stripInline(line.slice(3)), bold: true, size: 28, color: "0F233F" })],
                    spacing: { before: 300, after: 120 },
                }),
            );
            continue;
        }

        if (line.startsWith("### ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: stripInline(line.slice(4)), bold: true, size: 24, color: "12A1A6" })],
                    spacing: { before: 200, after: 100 },
                }),
            );
            continue;
        }

        if (line.startsWith("# ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: stripInline(line.slice(2)), bold: true, size: 32, color: "0F233F" })],
                    spacing: { before: 360, after: 160 },
                }),
            );
            continue;
        }

        if (line.startsWith("- ") || line.startsWith("* ")) {
            children.push(
                new Paragraph({
                    children: parseInlineDocx(line.slice(2)),
                    bullet: { level: 0 },
                    spacing: { after: 80 },
                }),
            );
            continue;
        }

        const olMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (olMatch) {
            children.push(
                new Paragraph({
                    children: parseInlineDocx(olMatch[2]),
                    numbering: { reference: "eml-numbering", level: 0 },
                    spacing: { after: 80 },
                }),
            );
            continue;
        }

        if (/^---+$/.test(line.trim())) {
            children.push(
                new Paragraph({
                    children: [],
                    border: {
                        bottom: {
                            color: "e2e8f0",
                            space: 1,
                            style: BorderStyle.SINGLE,
                            size: 6,
                        },
                    },
                    spacing: { before: 160, after: 160 },
                }),
            );
            continue;
        }

        children.push(
            new Paragraph({
                children: parseInlineDocx(line),
                spacing: { after: 100 },
            }),
        );
    }

    const doc = new Document({
        numbering: {
            config: [
                {
                    reference: "eml-numbering",
                    levels: [
                        {
                            level: 0,
                            format: "decimal" as const,
                            text: "%1.",
                            alignment: AlignmentType.LEFT,
                            style: {
                                paragraph: { indent: { left: 360, hanging: 260 } },
                            },
                        },
                    ],
                },
            ],
        },
        sections: [
            {
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: `ExplainMyLetter  |  Ref: ${referenceId}  |  ${dateStr}`,
                                        color: "64748b",
                                        size: 16,
                                    }),
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
                                children: [new TextRun({ text: DISCLAIMER, color: "94a3b8", size: 14 })],
                            }),
                        ],
                    }),
                },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: "ExplainMyLetter Breakdown",
                                bold: true,
                                size: 36,
                                color: "0d9488",
                            }),
                        ],
                        spacing: { after: 240 },
                    }),
                    ...children,
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    return Buffer.from(new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer));
}