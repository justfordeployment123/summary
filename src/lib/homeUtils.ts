import type { UrgencyLevel, UrgencyConfig } from "@/types/home";

// ─── Brand Colors ─────────────────────────────────────────────────────────────

export const BRAND = {
    navy: "#0F233F",
    teal1: "#54D6D4",
    teal2: "#4FCCD2",
    teal3: "#12A1A6",
} as const;

// ─── Urgency Config ───────────────────────────────────────────────────────────

export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
    Routine: { bg: "#e6faf9", text: "#12A1A6", dot: "#54D6D4", border: "#b2eeec", label: "Routine" },
    Important: { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b", border: "#fde68a", label: "Important" },
    "Time-Sensitive": { bg: "#fff1f2", text: "#be123c", dot: "#f43f5e", border: "#fecdd3", label: "Time-Sensitive" },
};

// ─── Upload Process Steps ─────────────────────────────────────────────────────

export const PROCESS_STEPS = [
    "Requesting secure upload URL…",
    "Uploading document to secure storage…",
    "Reading and extracting document text…",
    "Automated Technology is analysing your letter…",
    "Summary ready.",
] as const;

// ─── Polling Config ───────────────────────────────────────────────────────────

export const MAX_POLLS = 40;
export const POLL_INTERVAL = 3000;

// ─── Utility Functions ────────────────────────────────────────────────────────

export function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`;
}

export function markdownToHtml(md: string): string {
    if (!md) return "";

    const lines = md.split("\n");
    const out: string[] = [];

    const inline = (s: string) =>
        s
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/`(.+?)`/g, `<code style="background:#f1f5f9;border-radius:4px;padding:2px 6px;font-size:0.9em;color:#0F233F">$1</code>`);

    out.push(`
      <div style="
        font-family: 'Raleway', 'Helvetica Neue', sans-serif;
        max-width: 850px;
        margin: 0 auto;
        padding: 0px 0px;
        color: #1e293b;
        background: #ffffff;
        line-height: 1.8;
      ">
    `);

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = raw.trimEnd();

        if (line.trim() === "") {
            out.push(`<div style="height:10px"></div>`);
            continue;
        }

        // ── Horizontal Rule ────────────────────────────────────────────────
        if (line.trim() === "---") {
            continue;
        }

        // ── #### Sub-sub-heading ───────────────────────────────────────────
        const h4 = line.match(/^####\s+(.*)/);
        if (h4) {
            out.push(`
              <h4 style="
                font-size: 1.05rem;
                font-weight: 700;
                color: #12A1A6;
                margin: 14px 0 6px 0;
                display: flex;
                align-items: center;
                gap: 6px;
              ">
                <span style="width: 3px; height: 14px; background: #54D6D4; border-radius: 2px; display: inline-block; flex-shrink: 0;"></span>
                ${inline(h4[1])}
              </h4>
            `);
            continue;
        }

        // ── ### Sub-heading ────────────────────────────────────────────────
        const h3 = line.match(/^###\s+(.*)/);
        if (h3) {
            out.push(`
              <h3 style="
                font-size: 1.3rem;
                font-weight: 800;
                color: #12A1A6;
                margin: 20px 0 10px 0;
                letter-spacing: -0.01em;
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <span style="color: #54D6D4;">&#9658;</span> ${inline(h3[1])}
              </h3>
            `);
            continue;
        }

        // ── ## Major Section Heading ───────────────────────────────────────
        const h2 = line.match(/^##\s+(.*)/);
        if (h2) {
            out.push(`
              <div style="margin: 28px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
                <h2 style="
                  font-size: 1.85rem;
                  font-weight: 900;
                  color: #12A1A6;
                  margin: 0;
                  letter-spacing: -0.03em;
                  line-height: 1.2;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                ">
                  <span style="width: 5px; height: 30px; background: #12A1A6; border-radius: 4px; display: inline-block; flex-shrink: 0;"></span>
                  ${inline(h2[1])}
                </h2>
              </div>
            `);
            continue;
        }

        // ── Indented Bullet (sub-point) ────────────────────────────────────
        const indentedUl = line.match(/^(\s+)[-*]\s+(.*)/);
        if (indentedUl) {
            const depth = Math.floor(indentedUl[1].length / 2);
            const paddingLeft = 8 + depth * 24;
            out.push(`
              <div style="display: flex; gap: 14px; margin-bottom: 8px; padding-left: ${paddingLeft}px;">
                <div style="display: flex; flex-direction: column; align-items: center; padding-top: 10px;">
                  <div style="width: 6px; height: 6px; border-radius: 50%; background: #54D6D4; flex-shrink: 0;"></div>
                </div>
                <div style="font-size: 1.05rem; color: #334155; line-height: 1.7;">${inline(indentedUl[2])}</div>
              </div>
            `);
            continue;
        }

        // ── Top-level Bullet ───────────────────────────────────────────────
        const ulMatch = line.match(/^[-*]\s+(.*)/);
        if (ulMatch) {
            out.push(`
              <div style="display: flex; gap: 18px; margin-bottom: 10px; padding-left: 8px;">
                <div style="display: flex; flex-direction: column; align-items: center; padding-top: 12px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #54D6D4; box-shadow: 0 0 0 4px #e0f2f1; flex-shrink: 0;"></div>
                </div>
                <div style="font-size: 1.1rem; color: #334155;">${inline(ulMatch[1])}</div>
              </div>
            `);
            continue;
        }

        // ── Ordered Steps ──────────────────────────────────────────────────
        const olMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (olMatch) {
            out.push(`
              <div style="display: flex; gap: 24px; margin: 12px 0; background: #fbfcfd; padding: 16px 8px; border-radius: 16px; border: 1px solid #f1f5f9; border-left: 5px solid #12A1A6;">
                <div style="font-size: 1.8rem; font-weight: 900; color: #12A1A6; opacity: 0.3; line-height: 1;">
                  ${olMatch[1]}
                </div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #0F233F; line-height: 1.6;">
                  ${inline(olMatch[2])}
                </div>
              </div>
            `);
            continue;
        }

        // ── **Bold Label** only (nothing after) ───────────────────────────
        const termLabel = line.match(/^\*\*(.+?)\*\*\s*$/);
        if (termLabel) {
            out.push(`
              <div style="margin: 20px 0 6px 0;">
                <div style="font-size: 1.1rem; font-weight: 800; color: #0F233F;">
                  ${inline(termLabel[1])}
                </div>
              </div>
            `);
            continue;
        }

        // ── **Bold Label** with trailing text ─────────────────────────────
        const termWithText = line.match(/^\*\*(.+?)\*\*\s+(.*)/);
        if (termWithText) {
            out.push(`
              <div style="margin: 16px 0; padding-left: 12px; border-left: 3px solid #f1f5f9;">
                <div style="font-size: 0.85rem; font-weight: 800; color: #12A1A6; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px;">
                  ${inline(termWithText[1])}
                </div>
                <div style="font-size: 1.1rem; color: #1e293b; font-weight: 500;">
                  ${inline(termWithText[2])}
                </div>
              </div>
            `);
            continue;
        }

        // ── Default Paragraph ──────────────────────────────────────────────
        out.push(`
          <p style="font-size: 1.1rem; color: #334155; margin: 0 0 12px 0; font-weight: 400; line-height: 1.9;">
            ${inline(line)}
          </p>
        `);
    }

    // ── Disclaimer ────────────────────────────────────────────────────────
    const footer = out.findIndex((l) => l.toLowerCase().includes("informational purposes only and does not constitute"));
    if (footer !== -1) {
        out[footer] = `
          <div style="margin-top: 48px; padding: 24px; background: #f8fafc; border-radius: 12px; font-size: 0.95rem; color: #64748b; line-height: 1.6; text-align: center; border: 1px solid #e2e8f0;">
            ${out[footer]}
          </div>
        `;
    }

    out.push(`</div>`);
    return out.join("\n");
}
