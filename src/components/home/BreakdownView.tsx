"use client";

/**
 * BreakdownView — renders the full paid breakdown document.
 *
 * Drop this wherever you currently show the post-payment detailed breakdown.
 * Props:
 *   breakdown  — the raw markdown string from the AI
 *   reference  — job/file reference ID
 *   firstName  — user's first name
 *   onReset    — callback to upload a new letter
 */

import { markdownToHtml } from "@/lib/homeUtils";

interface BreakdownViewProps {
    breakdown: string;
    reference?: string;
    firstName?: string;
    onReset?: () => void;
}

// ─── Mini atoms ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                color: "#12A1A6",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
            }}
        >
            <span
                style={{
                    display: "inline-block",
                    width: 18,
                    height: 2,
                    background: "linear-gradient(90deg,#12A1A6,#54D6D4)",
                    borderRadius: 2,
                }}
            />
            {children}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BreakdownView({ breakdown, reference, firstName, onReset }: BreakdownViewProps) {
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    const html = markdownToHtml(breakdown ?? "");

    return (
        <div
            style={{
                maxWidth: 780,
                margin: "0 auto",
                padding: "48px 24px 80px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                fontFamily: "'Raleway', sans-serif",
            }}
        >
            {/* ── Payment confirmed banner ── */}
            <div
                className="anim-fadeUp"
                style={{
                    borderRadius: 20,
                    background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                    border: "1.5px solid #86efac",
                    padding: "18px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,#16a34a,#22c55e)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 4px 14px rgba(22,163,74,0.35)",
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, color: "#15803d", fontSize: "0.95rem" }}>Payment Confirmed</div>
                        <div style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 600, marginTop: 1 }}>
                            Your full breakdown is ready below.
                        </div>
                    </div>
                </div>
                {reference && (
                    <div
                        style={{
                            fontSize: "0.72rem",
                            color: "#4ade80",
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            background: "rgba(22,163,74,0.12)",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontFamily: "monospace",
                        }}
                    >
                        Ref: {reference}
                    </div>
                )}
            </div>

            {/* ── Breakdown document card ── */}
            <div
                className="anim-fadeUp-1"
                style={{
                    borderRadius: 24,
                    background: "#fff",
                    boxShadow: "0 2px 0 0 #e2e8f0, 0 12px 48px rgba(15,35,63,0.09)",
                    border: "1px solid #f1f5f9",
                    overflow: "hidden",
                }}
            >
                {/* Card header */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #0a1f36 0%, #0F233F 60%, #133352 100%)",
                        padding: "32px 36px 30px",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Decorative glow */}
                    <div
                        style={{
                            position: "absolute",
                            top: -60,
                            right: -60,
                            width: 200,
                            height: 200,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(84,214,212,0.14) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: -40,
                            left: -20,
                            width: 160,
                            height: 160,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(18,161,166,0.08) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }}
                    />

                    {/* Meta row */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                            marginBottom: 16,
                        }}
                    >
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "rgba(84,214,212,0.15)",
                                border: "1px solid rgba(84,214,212,0.3)",
                                borderRadius: 99,
                                padding: "4px 14px 4px 8px",
                            }}
                        >
                            <div
                                style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background: "#54D6D4",
                                    boxShadow: "0 0 6px #54D6D4",
                                }}
                            />
                            <span
                                style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    color: "#54D6D4",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                }}
                            >
                                Full Breakdown
                            </span>
                        </div>

                        {/* Date chip */}
                        <span
                            style={{
                                fontSize: "0.75rem",
                                color: "rgba(255,255,255,0.4)",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                            }}
                        >
                            {today}
                        </span>
                    </div>

                    <h2
                        style={{
                            fontSize: "1.9rem",
                            fontWeight: 900,
                            color: "#fff",
                            lineHeight: 1.15,
                            margin: 0,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Your Detailed{" "}
                        <span
                            style={{
                                background: "linear-gradient(90deg,#54D6D4,#38c9c9)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Breakdown
                        </span>
                    </h2>
                    <p
                        style={{
                            fontSize: "0.88rem",
                            color: "rgba(255,255,255,0.5)",
                            marginTop: 8,
                            fontWeight: 500,
                            lineHeight: 1.5,
                        }}
                    >
                        Section-by-section analysis with actions, deadlines &amp; next steps
                        {firstName ? ` — prepared for ${firstName}` : ""}.
                    </p>
                </div>

                {/* Rendered breakdown body */}
                <div
                    style={{ padding: "32px 36px 36px", display: "flex", flexDirection: "column", gap: 6 }}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>

            {/* ── Reset / upload another ── */}
            {onReset && (
                <button
                    onClick={onReset}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        fontFamily: "Raleway, sans-serif",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        justifyContent: "center",
                        padding: "8px",
                        transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5m7-7l-7 7 7 7" />
                    </svg>
                    Upload a different letter
                </button>
            )}
        </div>
    );
}