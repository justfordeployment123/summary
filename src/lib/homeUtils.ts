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
    "AI is analysing your letter…",
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
    let inUl = false,
        inOl = false;

    const closeList = () => {
        if (inUl) {
            out.push("</ul>");
            inUl = false;
        }
        if (inOl) {
            out.push("</ol>");
            inOl = false;
        }
    };

    const parseLine = (line: string) =>
        line
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/`(.+?)`/g, "<code>$1</code>");

    for (const raw of lines) {
        const line = raw.trimEnd();

        if (/^---+$/.test(line.trim())) {
            closeList();
            out.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0"/>');
            continue;
        }
        const h2 = line.match(/^##\s+(.*)/);
        if (h2) {
            closeList();
            out.push(
                `<h2 style="font-family:Raleway,sans-serif;font-size:1.1rem;font-weight:700;color:#0F233F;margin:1.5rem 0 0.5rem">${parseLine(h2[1])}</h2>`,
            );
            continue;
        }

        const h3 = line.match(/^###\s+(.*)/);
        if (h3) {
            closeList();
            out.push(
                `<h3 style="font-family:Raleway,sans-serif;font-size:1rem;font-weight:600;color:#12A1A6;margin:1.2rem 0 0.4rem">${parseLine(h3[1])}</h3>`,
            );
            continue;
        }

        const ul = line.match(/^[-*]\s+(.*)/);
        if (ul) {
            if (inOl) {
                out.push("</ol>");
                inOl = false;
            }
            if (!inUl) {
                out.push('<ul style="padding-left:1.25rem;margin:0.5rem 0;list-style:disc">');
                inUl = true;
            }
            out.push(`<li style="color:#334155;font-size:0.9rem;line-height:1.7;margin-bottom:0.25rem">${parseLine(ul[1])}</li>`);
            continue;
        }

        const ol = line.match(/^\d+\.\s+(.*)/);
        if (ol) {
            if (inUl) {
                out.push("</ul>");
                inUl = false;
            }
            if (!inOl) {
                out.push('<ol style="padding-left:1.25rem;margin:0.5rem 0;list-style:decimal">');
                inOl = true;
            }
            out.push(`<li style="color:#334155;font-size:0.9rem;line-height:1.7;margin-bottom:0.25rem">${parseLine(ol[1])}</li>`);
            continue;
        }

        if (line.trim() === "") {
            closeList();
            out.push('<div style="height:0.5rem"></div>');
            continue;
        }

        closeList();
        out.push(`<p style="color:#334155;font-size:0.9rem;line-height:1.75;margin:0">${parseLine(line)}</p>`);
    }

    closeList();
    return out.join("\n");
}
