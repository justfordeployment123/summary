"use client";

import { URGENCY_CONFIG, markdownToHtml } from "@/lib/homeUtils";
import type { ProcessingViewProps, CompletedViewProps } from "@/types/home";

export function ProcessingView({ pollStatus, pollCount }: ProcessingViewProps) {
    return (
        <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
            <div style={{ maxWidth: 500, width: "100%", textAlign: "center", fontFamily: "Raleway, sans-serif" }}>
                <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 32px" }}>
                    <div style={{ 
                        position: "absolute", inset: 0, borderRadius: "50%", 
                        border: "4px solid #f1f5f9", borderTopColor: "#12A1A6",
                        animation: "spin 1s cubic-bezier(0.76, 0.35, 0.2, 0.7) infinite" 
                    }} />
                    <div style={{ 
                        position: "absolute", inset: 15, borderRadius: "50%", 
                        border: "4px solid #f1f5f9", borderBottomColor: "#54D6D4",
                        animation: "spin 1.5s reverse linear infinite" 
                    }} />
                </div>
                <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "#08121f", marginBottom: 12, letterSpacing: "-0.02em" }}>
                    Analyzing your document...
                </h2>
                <p style={{ fontSize: "1.1rem", color: "#64748b", lineHeight: 1.6, marginBottom: 32, fontWeight: 500 }}>
                    {pollStatus}
                </p>
                <div style={{ width: "100%", height: 6, background: "#f1f5f9", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                    <div className="progress-fill" style={{ width: "65%", height: "100%", background: "linear-gradient(90deg, #12A1A6, #54D6D4)", borderRadius: 10 }} />
                </div>
                {pollCount > 0 && <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700 }}>VERIFYING STEP {pollCount}</p>}
            </div>
        </div>
    );
}

export function CompletedView({ summaryData, completedData, handleDownload, handleReset }: CompletedViewProps) {
    // Assuming firstName is passed via summaryData or context, using fallback for now
    // const firstName = summaryData?.firstName || "there";
    const urgency = summaryData?.urgency && URGENCY_CONFIG[summaryData.urgency] ? URGENCY_CONFIG[summaryData.urgency] : URGENCY_CONFIG["Routine"];

    return (
        <div style={{ 
            maxWidth: 850, 
            margin: "0 auto", 
            padding: "60px 24px", 
            fontFamily: "Raleway, sans-serif",
            background: "#fff" 
        }}>
            
            {/* 1. Success Notification */}
            <div style={{ 
                display: "flex", alignItems: "center", gap: 16, marginBottom: 48,
                padding: "16px 24px", borderRadius: 12, background: "#f0fdfd", border: "1px solid #b2eeec"
            }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#12A1A6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <span style={{ fontWeight: 800, color: "#0e6e71", fontSize: "0.95rem" }}>Breakdown Successfully Generated</span>
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>ID: {completedData.referenceId}</span>
            </div>

            {/* 2. Personalized Summary Section */}
            <div style={{ borderLeft: "8px solid #08121f", paddingLeft: 40, marginBottom: 64 }}>
                <div style={{ 
                    display: "inline-flex", alignItems: "center", gap: 8, 
                    background: "#f1f5f9", padding: "6px 12px", borderRadius: 6, marginBottom: 20 
                }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569", letterSpacing: "0.1em" }}>FREE SUMMARY</span>
                </div>
                <h1 style={{ fontSize: "2.8rem", fontWeight: 900, color: "#08121f", lineHeight: 1.1, margin: "0 0 16px", letterSpacing: "-0.04em" }}>
                    Your Letter, <span style={{ color: "#12A1A6" }}>Explained.</span>
                </h1>
                <p style={{ fontSize: "1.2rem", color: "#334155", fontWeight: 500, maxWidth: 650, lineHeight: 1.7 }}>
                    Hello, here is the plain English breakdown of your document. We’ve highlighted the most critical points and necessary next steps below.
                </p>
                <div style={{ 
                    marginTop: 24, display: "inline-flex", alignItems: "center", gap: 12, 
                    padding: "12px 20px", borderRadius: 12, background: urgency.bg, border: `1px solid ${urgency.border}` 
                }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: urgency.dot }} />
                    <span style={{ fontWeight: 800, color: urgency.text, fontSize: "0.9rem" }}>{summaryData.urgency?.toUpperCase()} PRIORITY</span>
                </div>
            </div>

            {/* 3. Detailed Analysis (Rendered via the vertical markdown function) */}
            <div style={{ borderLeft: "8px solid #12A1A6", paddingLeft: 40, marginBottom: 64 }}>
                 <div style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#08121f", margin: 0 }}>Full Breakdown</h2>
                    <p style={{ color: "#64748b", fontWeight: 500, marginTop: 4 }}>Deep-dive analysis and action items</p>
                 </div>
                 {/* This container receives the HTML from the vertical markdown function we built */}
                 <div dangerouslySetInnerHTML={{ __html: markdownToHtml(completedData.detailedBreakdown) }} />
            </div>

            {/* 4. Actions & Downloads */}
            <div style={{ 
                marginTop: 80, padding: "48px", background: "#f8fafc", borderRadius: 32, textAlign: "center",
                border: "1px solid #f1f5f9"
            }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#08121f", marginBottom: 8 }}>Save this report</h3>
                <p style={{ color: "#64748b", marginBottom: 32, fontWeight: 500 }}>Secure a permanent copy for your records.</p>
                
                <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                    {(["pdf", "docx", "txt"] as const).map((fmt) => (
                        <button 
                            key={fmt} 
                            onClick={() => handleDownload(fmt)} 
                            style={{
                                background: "#fff", border: "2px solid #e2e8f0", padding: "14px 28px",
                                borderRadius: 12, fontWeight: 800, color: "#0F233F", display: "flex",
                                alignItems: "center", gap: 10, cursor: "pointer", transition: "all 0.2s"
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                            {fmt.toUpperCase()}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleReset}
                    style={{
                        marginTop: 40, background: "none", border: "none", color: "#94a3b8",
                        fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", textDecoration: "underline"
                    }}
                >
                    Analyze another document
                </button>
            </div>
        </div>
    );
}