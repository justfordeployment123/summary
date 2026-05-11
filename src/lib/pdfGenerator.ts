// src/lib/pdfGenerator.ts
//
// Renders a paid breakdown to a PDF Buffer using PDFKit.
// Used by:
//   - /api/download/[format] (user-initiated download)
//   - sendBreakdownEmail (auto-emailed PDF on completion)

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export const DISCLAIMER =
    "This document is an Automated Technology generated summary for informational purposes only and does not constitute legal, financial, or professional advice.";

export function stripInline(line: string): string {
    return line
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1");
}

export function generatePDF(text: string, referenceId: string, dateStr: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                autoFirstPage: false,
                size: "A4",
                margins: { top: 90, bottom: 60, left: 50, right: 50 },
            });
            const chunks: Buffer[] = [];
            doc.on("data", (chunk: Buffer) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            const logoPath = path.join(process.cwd(), "public", "new-logo.png");
            const logoExists = fs.existsSync(logoPath);

            const drawPageChrome = () => {
                const pageWidth = doc.page.width;

                if (logoExists) {
                    doc.save();
                    doc.image(logoPath, pageWidth - 110, 20, { width: 100 });
                    doc.restore();
                }

                doc.x = doc.page.margins.left;
                doc.y = doc.page.margins.top;
            };

            doc.on("pageAdded", () => {
                drawPageChrome();
            });

            doc.addPage();

            // ── Title block ──
            doc.fontSize(18).fillColor("#12A1A6").font("Helvetica-Bold").text("ExplainMyLetter Breakdown", { align: "center" });

            doc.moveDown(0.3);
            doc.fontSize(9).fillColor("#64748b").font("Helvetica").text(`Ref: ${referenceId}   |   Date: ${dateStr}`, { align: "right" });

            doc.moveDown(0.4);
            doc.moveTo(50, doc.y)
                .lineTo(doc.page.width - 50, doc.y)
                .strokeColor("#e2e8f0")
                .lineWidth(1)
                .stroke();
            doc.moveDown(0.8);

            const lines = text.trim().split("\n");

            for (const raw of lines) {
                const line = raw.trimEnd();

                if (!line) {
                    doc.moveDown(0.3);
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

                if (line.startsWith("### ")) {
                    doc.moveDown(0.4);
                    doc.fontSize(11)
                        .fillColor("#12A1A6")
                        .font("Helvetica-Bold")
                        .text(stripInline(line.slice(4)));
                    doc.moveDown(0.2);
                    continue;
                }

                if (line.startsWith("## ")) {
                    doc.moveDown(0.5);
                    doc.fontSize(13)
                        .fillColor("#12A1A6")
                        .font("Helvetica-Bold")
                        .text(stripInline(line.slice(3)));
                    doc.moveDown(0.15);
                    doc.moveTo(50, doc.y)
                        .lineTo(doc.page.width - 50, doc.y)
                        .strokeColor("#e2e8f0")
                        .lineWidth(0.5)
                        .stroke();
                    doc.moveDown(0.3);
                    continue;
                }

                if (line.startsWith("# ")) {
                    doc.moveDown(0.5);
                    doc.fontSize(15)
                        .fillColor("#12A1A6")
                        .font("Helvetica-Bold")
                        .text(stripInline(line.slice(2)));
                    doc.moveDown(0.15);
                    doc.moveTo(50, doc.y)
                        .lineTo(doc.page.width - 50, doc.y)
                        .strokeColor("#e2e8f0")
                        .lineWidth(1)
                        .stroke();
                    doc.moveDown(0.3);
                    continue;
                }

                const indentedBullet = line.match(/^(\s+)[-*]\s+(.*)/);
                if (indentedBullet) {
                    const depth = Math.floor(indentedBullet[1].length / 2);
                    const content = indentedBullet[2];
                    const boldMatch = content.match(/^\*\*(.+?)\*\*\s*(.*)/);
                    if (boldMatch) {
                        doc.fontSize(10)
                            .fillColor("#334155")
                            .font("Helvetica-Bold")
                            .text("•  " + stripInline(boldMatch[1]), { indent: 10 + depth * 16, lineGap: 2, continued: boldMatch[2].length > 0 });
                        if (boldMatch[2]) {
                            doc.fontSize(10)
                                .fillColor("#334155")
                                .font("Helvetica")
                                .text("  " + stripInline(boldMatch[2]), { lineGap: 2 });
                        }
                    } else {
                        doc.fontSize(10)
                            .fillColor("#334155")
                            .font("Helvetica")
                            .text("•  " + stripInline(content), { indent: 10 + depth * 16, lineGap: 2 });
                    }
                    doc.moveDown(0.12);
                    continue;
                }

                if (line.startsWith("- ") || line.startsWith("* ")) {
                    const content = line.slice(2);
                    const boldMatch = content.match(/^\*\*(.+?)\*\*\s*(.*)/);
                    if (boldMatch) {
                        doc.fontSize(10)
                            .fillColor("#334155")
                            .font("Helvetica-Bold")
                            .text("•  " + stripInline(boldMatch[1]), { indent: 10, lineGap: 2, continued: boldMatch[2].length > 0 });
                        if (boldMatch[2]) {
                            doc.fontSize(10)
                                .fillColor("#334155")
                                .font("Helvetica")
                                .text("  " + stripInline(boldMatch[2]), { lineGap: 2 });
                        }
                    } else {
                        doc.fontSize(10)
                            .fillColor("#334155")
                            .font("Helvetica")
                            .text("•  " + stripInline(content), { indent: 10, lineGap: 2 });
                    }
                    doc.moveDown(0.15);
                    continue;
                }

                const olMatch = line.match(/^(\d+)\.\s+(.*)/);
                if (olMatch) {
                    doc.fontSize(10)
                        .fillColor("#334155")
                        .font("Helvetica")
                        .text(`${olMatch[1]}.  ${stripInline(olMatch[2])}`, { indent: 10, lineGap: 2 });
                    doc.moveDown(0.15);
                    continue;
                }

                const termLabel = line.match(/^\*\*(.+?)\*\*\s*$/);
                if (termLabel) {
                    doc.moveDown(0.3);
                    doc.fontSize(11).fillColor("#0F233F").font("Helvetica-Bold").text(stripInline(termLabel[1]));
                    doc.moveDown(0.15);
                    continue;
                }

                const termWithText = line.match(/^\*\*(.+?)\*\*\s+(.*)/);
                if (termWithText) {
                    doc.moveDown(0.2);
                    doc.fontSize(10).fillColor("#12A1A6").font("Helvetica-Bold").text(stripInline(termWithText[1]));
                    if (termWithText[2]) {
                        doc.fontSize(10).fillColor("#334155").font("Helvetica").text(stripInline(termWithText[2]), { lineGap: 2 });
                    }
                    doc.moveDown(0.15);
                    continue;
                }

                doc.fontSize(10).fillColor("#334155").font("Helvetica").text(stripInline(line), { lineGap: 2 });
                doc.moveDown(0.2);
            }

            // ── Footer disclaimer — flows naturally with content, no absolute positioning ──
            doc.moveDown(1);
            doc.moveTo(50, doc.y)
                .lineTo(doc.page.width - 50, doc.y)
                .strokeColor("#e2e8f0")
                .lineWidth(0.5)
                .stroke();
            doc.moveDown(0.5);
            doc.fontSize(7).fillColor("#94a3b8").font("Helvetica").text(DISCLAIMER, {
                align: "center",
                lineGap: 2,
            });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}
