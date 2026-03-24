"use client";

import { URGENCY_CONFIG, markdownToHtml } from "@/lib/homeUtils";
import type { ProcessingViewProps, CompletedViewProps } from "@/types/home";

export function ProcessingView({ pollStatus, pollCount }: ProcessingViewProps) {
    return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
            <div className="glass-card anim-fadeIn" style={{ maxWidth: 440, width: "100%", padding: "52px 40px", textAlign: "center" }}>
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,rgba(18,161,166,0.15),rgba(84,214,212,0.15))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 24px",
                    }}
                >
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            border: "3px solid transparent",
                            borderTopColor: "#12A1A6",
                            borderRadius: "50%",
                            animation: "spin 0.9s linear infinite",
                        }}
                    />
                </div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0F233F", marginBottom: 10 }}>Preparing Your Breakdown</h3>
                <p className="pulse" style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.6, marginBottom: 28 }}>
                    {pollStatus}
                </p>
                <div className="progress-track" style={{ maxWidth: 240, margin: "0 auto 12px" }}>
                    <div className="progress-fill" style={{ width: "65%", animation: "gradientShift 2s ease infinite" }} />
                </div>
                {pollCount > 0 && <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Checking… ({pollCount})</p>}
            </div>
        </div>
    );
}

export function CompletedView({ summaryData, completedData, handleDownload, handleReset }: CompletedViewProps) {
    const urgency = summaryData?.urgency && URGENCY_CONFIG[summaryData.urgency] ? URGENCY_CONFIG[summaryData.urgency] : URGENCY_CONFIG["Routine"];

    return (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Success banner */}
            <div
                className="anim-fadeUp"
                style={{
                    padding: "18px 24px",
                    borderRadius: 16,
                    background: "linear-gradient(135deg,#f0fdfd,#e6faf9)",
                    border: "1px solid #b2eeec",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                }}
            >
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        animation: "checkPop 0.5s ease",
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div>
                    <div style={{ fontWeight: 800, color: "#0e6e71", fontSize: "0.95rem" }}>Payment Confirmed</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Your full breakdown is ready below.</div>
                </div>
                {completedData.referenceId && (
                    <div style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#94a3b8", fontFamily: "monospace" }}>
                        Ref: {completedData.referenceId}
                    </div>
                )}
            </div>

            {/* Summary card */}
            <div className="glass-card anim-fadeUp-1" style={{ overflow: "hidden" }}>
                <div
                    style={{
                        padding: "22px 32px",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0F233F" }}>Free Summary</h3>
                    <div className="urgency-badge" style={{ background: urgency.bg, color: urgency.text, borderColor: urgency.border }}>
                        <div className="urgency-dot" style={{ background: urgency.dot }} />
                        {summaryData.urgency}
                    </div>
                </div>
                <div style={{ padding: "20px 32px" }}>
                    <p style={{ color: "#64748b", lineHeight: 1.75, fontSize: "0.9rem" }}>{summaryData.summary}</p>
                </div>
            </div>

            {/* Detailed breakdown */}
            <div className="glass-card anim-fadeUp-2" style={{ overflow: "hidden", border: "1.5px solid #b2eeec" }}>
                <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f0fdfd,#e6faf9)" }}>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0F233F" }}>Your Detailed Breakdown</h2>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
                        Section-by-section analysis with actions, deadlines & next steps
                    </p>
                </div>
                <div style={{ padding: "28px 32px" }} dangerouslySetInnerHTML={{ __html: markdownToHtml(completedData.detailedBreakdown) }} />
                <div style={{ padding: "16px 32px", background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
                    <p style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "center" }}>
                        This document is an AI-generated summary for informational purposes only and does not constitute legal, financial, or
                        professional advice.
                    </p>
                </div>
            </div>

            {/* Downloads */}
            <div className="glass-card anim-fadeUp-3" style={{ padding: "24px 32px" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0F233F", marginBottom: 16 }}>Download Your Breakdown</h3>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {(["pdf", "docx", "txt"] as const).map((fmt) => (
                        <button key={fmt} onClick={() => handleDownload(fmt)} className="dl-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {fmt.toUpperCase()}
                        </button>
                    ))}
                </div>
                <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 12 }}>Download links expire 72 hours after job completion.</p>
            </div>

            <button
                onClick={handleReset}
                style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontFamily: "Raleway,sans-serif",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    justifyContent: "center",
                    padding: "8px",
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5m7-7l-7 7 7 7" />
                </svg>
                Upload another letter
            </button>
        </div>
    );
}
