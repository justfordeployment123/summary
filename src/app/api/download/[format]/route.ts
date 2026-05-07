// src/app/api/download/[format]/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import connectToDatabase from "@/lib/db";
// import { Job } from "@/models/Job";
// import PDFDocument from "pdfkit";
// import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, BorderStyle } from "docx";
// import path from "path";
// import fs from "fs";
// // import path from "path"; // Uncomment if using the custom font fallback below

// // ─── Constants ───────────────────────────────────────────────────────────────

// const EXPIRY_HOURS = 72;
// const DISCLAIMER =
//     "This document is an Automated Technology generated summary for informational purposes only and does not constitute legal, financial, or professional advice.";

// // ─── GET handler ─────────────────────────────────────────────────────────────

// export async function GET(req: NextRequest, { params }: { params: Promise<{ format: string }> }) {
//     try {
//         await connectToDatabase();

//         const resolvedParams = await params;
//         const format = resolvedParams.format.toLowerCase();

//         const jobId = req.nextUrl.searchParams.get("job_id");
//         const token = req.nextUrl.searchParams.get("token");

//         if (!jobId || !token) {
//             return NextResponse.json({ error: "Missing job ID or access token." }, { status: 400 });
//         }

//         if (!["pdf", "docx", "txt"].includes(format)) {
//             return NextResponse.json({ error: "Invalid format requested." }, { status: 400 });
//         }

//         // ── 1. Retrieve job & verify token ──
//         const job = await Job.findOne({ _id: jobId, access_token: token }).lean<any>();

//         if (!job) {
//             return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
//         }

//         // ── 2. Enforce paid content guard ──
//         if (job.status !== "COMPLETED" || !job.stripe_payment_intent_id) {
//             return NextResponse.json({ error: "Detailed breakdown not available or payment not confirmed." }, { status: 403 });
//         }

//         // ── 3. Enforce 72-hour expiry ──
//         const processedAt = new Date(job.processed_at).getTime();
//         const hoursSinceCompletion = (Date.now() - processedAt) / (1000 * 60 * 60);

//         if (hoursSinceCompletion > EXPIRY_HOURS) {
//             return NextResponse.json({ error: "Download link has expired. Links expire 72 hours after completion." }, { status: 410 });
//         }

//         const breakdownText: string = job.paid_summary || "No breakdown available.";
//         const referenceId: string = job.reference_id || String(job._id);
//         const dateStr: string = new Date(job.processed_at).toLocaleDateString("en-GB");

//         // ── 4. Generate by format ──

//         if (format === "txt") {
//             const txtContent = [
//                 "ExplainMyLetter Breakdown",
//                 `Reference: ${referenceId}`,
//                 `Date: ${dateStr}`,
//                 "",
//                 stripMarkdown(breakdownText), // was just breakdownText
//                 // breakdownText,
//                 "",
//                 "---",
//                 DISCLAIMER,
//             ].join("\n");

//             return new NextResponse(txtContent, {
//                 headers: {
//                     "Content-Type": "text/plain; charset=utf-8",
//                     "Content-Disposition": `attachment; filename="breakdown_${referenceId}.txt"`,
//                 },
//             });
//         }

//         if (format === "pdf") {
//             const pdfBuffer = await generatePDF(breakdownText, referenceId, dateStr);
//             return new NextResponse(new Uint8Array(pdfBuffer), {
//                 headers: {
//                     "Content-Type": "application/pdf",
//                     "Content-Disposition": `attachment; filename="breakdown_${referenceId}.pdf"`,
//                 },
//             });
//         }

//         if (format === "docx") {
//             const docxBuffer = await generateDOCX(breakdownText, referenceId, dateStr);
//             return new NextResponse(new Uint8Array(docxBuffer), {
//                 headers: {
//                     "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//                     "Content-Disposition": `attachment; filename="breakdown_${referenceId}.docx"`,
//                 },
//             });
//         }

//         return NextResponse.json({ error: "Unhandled format." }, { status: 400 });
//     } catch (error) {
//         console.error("[download/route]", error);
//         return NextResponse.json({ error: "Failed to generate document." }, { status: 500 });
//     }
// }
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    Header,
    Footer,
    BorderStyle,
    ImageRun,
    TabStopType,
    LevelFormat,
    Table,
    TableRow,
    TableCell,
    TableBorders,
    WidthType,
    VerticalAlign,
} from "docx";
import path from "path";
import fs from "fs";
import { generatePDF, stripInline, DISCLAIMER } from "@/lib/pdfGenerator";

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPIRY_HOURS = 72;

// Helper function placeholder (assuming you have this defined in your file)
// function stripMarkdown(text: string): string {
//     return text.replace(/(#|\*|_|\[|\]|\(|\))/g, "");
// }

// Ensure you have your generatePDF and generateDOCX functions defined below this in your actual file

export async function POST(req: NextRequest, { params }: { params: Promise<{ format: string }> }) {
    try {
        const resolvedParams = await params;
        const format = resolvedParams.format.toLowerCase();

        // Extract data from the POST body instead of URL params
        const body = await req.json();
        const { job_id, token, breakdownText } = body;

        if (!job_id || !token) {
            return NextResponse.json({ error: "Missing job ID or access token." }, { status: 400 });
        }

        if (!breakdownText) {
            return NextResponse.json({ error: "Missing breakdown text." }, { status: 400 });
        }

        if (!["pdf", "docx", "txt"].includes(format)) {
            return NextResponse.json({ error: "Invalid format requested." }, { status: 400 });
        }

        // ── 1. Retrieve job & verify token via Prisma ──
        const job = await prisma.job.findFirst({
            where: {
                id: job_id,
                access_token: token,
            },
        });

        if (!job) {
            return NextResponse.json({ error: "Invalid job reference or access token." }, { status: 403 });
        }

        // ── 2. Enforce paid content guard ──
        if (job.status !== "COMPLETED" || !job.stripe_payment_intent_id) {
            return NextResponse.json({ error: "Detailed breakdown not available or payment not confirmed." }, { status: 403 });
        }

        // ── 3. Enforce 72-hour expiry ──
        // Fallback to updated_at if processed_at is null
        const processedAtDate = job.processed_at || job.updated_at;
        const hoursSinceCompletion = (Date.now() - processedAtDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCompletion > EXPIRY_HOURS) {
            return NextResponse.json({ error: "Download link has expired. Links expire 72 hours after completion." }, { status: 410 });
        }

        const referenceId: string = job.reference_id || job.id;
        const dateStr: string = processedAtDate.toLocaleDateString("en-GB");

        // ── 4. Generate by format ──

        if (format === "txt") {
            const txtContent = [
                "ExplainMyLetter Breakdown",
                `Reference: ${referenceId}`,
                `Date: ${dateStr}`,
                "",
                stripMarkdown(breakdownText),
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

function stripMarkdown(text: string): string {
    return text
        .split("\n")
        .map((line) => {
            const trimmed = line.trimEnd();
            // Remove heading markers
            if (/^#{1,6}\s+/.test(trimmed)) return trimmed.replace(/^#{1,6}\s+/, "");
            // Remove bullet markers
            if (/^[-*]\s+/.test(trimmed)) return "• " + trimmed.slice(2);
            // Remove ordered list markers (keep the number)
            const ol = trimmed.match(/^(\d+)\.\s+(.*)/);
            if (ol) return `${ol[1]}. ${ol[2]}`;
            // Remove horizontal rules
            if (/^---+$/.test(trimmed)) return "";
            // Strip inline markdown
            return trimmed
                .replace(/\*\*(.+?)\*\*/g, "$1")
                .replace(/\*(.+?)\*/g, "$1")
                .replace(/`(.+?)`/g, "$1");
        })
        .join("\n");
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

// ─── PDF generator (extracted to @/lib/pdfGenerator) ─────────────────────────
// generatePDF, stripInline, and DISCLAIMER are imported at the top of this file.

// ─── DOCX generator ───────────────────────────────────────────────────────────

// Make sure you have Table, TableRow, TableCell, TableBorders, WidthType, and VerticalAlign imported!

async function generateDOCX(text: string, referenceId: string, dateStr: string): Promise<Buffer> {
    const children: Paragraph[] = [];
    const lines = text.split("\n");
    referenceId = referenceId.split(".")[0]; // Strip file extension if present

    // ── Read logo if it exists ──
    const logoPath = path.join(process.cwd(), "public", "new-logo.png");
    const logoExists = fs.existsSync(logoPath);
    const logoData = logoExists ? fs.readFileSync(logoPath) : null;

    // A4 content width with 1-inch margins: 11906 - 1440 - 1440 = 9026 DXA
    const CONTENT_WIDTH = 9026;

    for (const raw of lines) {
        const line = raw.trimEnd();

        if (!line) {
            children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
            continue;
        }

        if (line.startsWith("# ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: stripInline(line.slice(2)), bold: true, size: 32, color: "0d9488", font: "Arial" })],
                    spacing: { before: 360, after: 160 },
                    border: {
                        bottom: { color: "0d9488", space: 1, style: BorderStyle.SINGLE, size: 6 },
                    },
                }),
            );
            continue;
        }

        if (line.startsWith("## ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: stripInline(line.slice(3)), bold: true, size: 28, color: "12A1A6", font: "Arial" })],
                    spacing: { before: 300, after: 120 },
                }),
            );
            continue;
        }

        if (line.startsWith("### ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: stripInline(line.slice(4)), bold: true, size: 24, color: "12A1A6", font: "Arial" })],
                    spacing: { before: 200, after: 100 },
                }),
            );
            continue;
        }

        if (line.startsWith("- ") || line.startsWith("* ")) {
            children.push(
                new Paragraph({
                    children: parseInlineDocx(line.slice(2)),
                    numbering: { reference: "eml-bullets", level: 0 },
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
                        bottom: { color: "e2e8f0", space: 1, style: BorderStyle.SINGLE, size: 6 },
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

    // ── Header: Table Layout (Logo/Brand left, Ref right) ──
    const headerChildren: (Paragraph | Table)[] = [];

    // Define what goes in the left cell (Logo vs Fallback Text)
    const leftCellContent = logoData
        ? new Paragraph({
              children: [
                  new ImageRun({
                      data: logoData,
                      transformation: { width: 130, height: 50 },
                      type: "png",
                  }),
              ],
          })
        : new Paragraph({
              children: [new TextRun({ text: "ExplainMyLetter", bold: true, color: "0d9488", size: 24, font: "Arial" })],
          });

    // Add the borderless 2-column table
    headerChildren.push(
        new Table({
            // 1. Force the exact column widths at the root table level
            columnWidths: [4413, 4613],

            // 2. Explicitly strip every possible border
            borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },

            // 3. Set the total width to absolute DXA rather than percentage
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },

            rows: [
                new TableRow({
                    children: [
                        // ── Left Cell (Logo/Brand) ──
                        new TableCell({
                            // 4. Lock cell width to absolute DXA
                            width: { size: 4413, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            children: [leftCellContent],
                        }),
                        // ── Right Cell (Ref Info) ──
                        new TableCell({
                            // 4. Lock cell width to absolute DXA
                            width: { size: 4613, type: WidthType.DXA },
                            verticalAlign: VerticalAlign.CENTER,
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({
                                            text: `Ref: ${referenceId}  |  ${dateStr}`,
                                            color: "64748b",
                                            size: 16,
                                            font: "Arial",
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        }),
    );
    // Thin teal rule under the header
    headerChildren.push(
        new Paragraph({
            children: [],
            border: {
                top: { color: "0d9488", space: 1, style: BorderStyle.SINGLE, size: 4 }, // Changed to top border since the table sits right above it
            },
            spacing: { before: 60, after: 0 },
        }),
    );

    const doc = new Document({
        styles: {
            default: {
                document: { run: { font: "Arial", size: 22 } }, // 11pt body
            },
        },
        numbering: {
            config: [
                {
                    reference: "eml-bullets",
                    levels: [
                        {
                            level: 0,
                            format: LevelFormat.BULLET,
                            text: "\u2022",
                            alignment: AlignmentType.LEFT,
                            style: {
                                paragraph: { indent: { left: 720, hanging: 360 } },
                            },
                        },
                    ],
                },
                {
                    reference: "eml-numbering",
                    levels: [
                        {
                            level: 0,
                            format: LevelFormat.DECIMAL,
                            text: "%1.",
                            alignment: AlignmentType.LEFT,
                            style: {
                                paragraph: { indent: { left: 720, hanging: 360 } },
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
                        size: { width: 11906, height: 16838 }, // A4
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                    },
                },
                headers: {
                    default: new Header({ children: headerChildren }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            // Thin rule above footer text
                            new Paragraph({
                                children: [],
                                border: {
                                    top: { color: "e2e8f0", space: 1, style: BorderStyle.SINGLE, size: 4 },
                                },
                                spacing: { before: 0, after: 60 },
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: DISCLAIMER, color: "94a3b8", size: 14, font: "Arial" })], // Assuming DISCLAIMER is defined elsewhere in your file
                            }),
                        ],
                    }),
                },
                children: [
                    // Title block
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: "ExplainMyLetter Breakdown",
                                bold: true,
                                size: 36,
                                color: "0d9488",
                                font: "Arial",
                            }),
                        ],
                        spacing: { before: 120, after: 60 },
                    }),
                    // Decorative underline for title
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [],
                        border: {
                            bottom: { color: "0d9488", space: 1, style: BorderStyle.SINGLE, size: 8 },
                        },
                        spacing: { before: 0, after: 280 },
                    }),
                    ...children,
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    return Buffer.from(new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer));
}
