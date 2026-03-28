"use client";

import { useRouter } from "next/navigation";

const examples = [
    {
        type: "HMRC Tax Letter",
        badge: "Government",
        badgeColor: "#4f46e5",
        badgeBg: "#e0e7ff",
        before: "We are writing to inform you that your Self Assessment tax return for the year ending 5 April 2024 has been selected for review under Section 9A of the Taxes Management Act 1970. You are required to provide the documentation listed in Schedule 1 within 30 days of the date of this notice...",
        after: "HMRC wants to check your 2024 tax return. You have 30 days from this letter to send them documents they've listed. This is a compliance check — not a charge. You should gather the paperwork and respond by the deadline to avoid penalties.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
    {
        type: "NHS Appointment Letter",
        badge: "Medical",
        badgeColor: "#0f766e",
        badgeBg: "#ccfbf1",
        before: "Dear Patient, Following your referral from your GP, we are pleased to offer you an outpatient appointment at the Department of Cardiology. Please note that failure to attend without prior notification may result in your referral being discharged back to your GP...",
        after: "You have a cardiology appointment from your GP referral. You must attend or cancel in advance — if you miss it without telling them, they may remove you from the waiting list and refer you back to your GP, meaning you would need to start again.",
        urgency: "Important",
        urgencyColor: "#b45309",
        urgencyBg: "#fef3c7",
    },
    {
        type: "Council Enforcement Notice",
        badge: "Legal",
        badgeColor: "#be123c",
        badgeBg: "#fff1f2",
        before: "Notice is hereby given pursuant to Section 179 of the Town and Country Planning Act 1990 that the Local Planning Authority is satisfied that there has been a breach of planning control and that it is expedient to issue this Enforcement Notice...",
        after: "The council believes planning rules have been broken on your property. This is a formal legal notice under planning law. You have the right to appeal, but there is a strict deadline. You should read the full notice carefully and consider speaking to a planning professional.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
];

const URGENCY_STYLES: Record<string, { color: string; bg: string }> = {
    "Time-Sensitive": { color: "#dc2626", bg: "#fff1f2" },
    Important: { color: "#b45309", bg: "#fef3c7" },
    Routine: { color: "#0e6e71", bg: "#f0fdfd" },
};

export default function ExamplesPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ minHeight: "calc(100vh - 66px)", padding: "60px 24px 100px", background: "#f8fafc" }}>
            {/* Custom keyframes and responsive grid styles */}
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .example-grid {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    gap: 0;
                }
                .arrow-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                }
                .arrow-icon {
                    transform: rotate(0deg);
                    transition: transform 0.3s ease;
                }
                @media (max-width: 768px) {
                    .example-grid {
                        grid-template-columns: 1fr;
                    }
                    .arrow-container {
                        padding: 16px 0;
                        z-index: 10;
                    }
                    .arrow-icon {
                        transform: rotate(90deg);
                    }
                }
            `}</style>

            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                {/* Page Header */}
                <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 52, animationDelay: "0ms" }}>
                    <span
                            className="feature-chip"
                            style={{
                                marginBottom: 14,
                                display: "inline-flex",
                                fontSize: "1.1rem",
                                fontWeight: 800,
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
                                letterSpacing: "0.03em",
                                color: "#12A1A6",
                                background: "rgba(18, 161, 166, 0.1)",
                                padding: "8px 18px",
                                borderRadius: "8px",
                                textTransform: "uppercase",
                            }}
                        >
                            Examples
                        </span>
                    <h1
                        style={{
                            fontSize: "2.8rem",
                            fontWeight: 900,
                            color: "#0F233F",
                            letterSpacing: "-0.02em",
                            marginTop: 10,
                            lineHeight: 1.2,
                        }}
                    >
                        See it in action
                    </h1>
                    <p
                        style={{
                            fontSize: "1.1rem",
                            color: "#64748b",
                            marginTop: 16,
                            maxWidth: 500,
                            margin: "12px auto 0",
                            lineHeight: 1.6,
                        }}
                    >
                        Here's how Explain My Letter transforms confusing official language into clear, plain English.
                    </p>
                </div>

                {/* Examples List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    {examples.map((ex, i) => {
                        const urgencyStyle = URGENCY_STYLES[ex.urgency] || URGENCY_STYLES["Routine"];
                        return (
                            <div
                                key={ex.type}
                                className="glass-card animate-fade-up"
                                style={{
                                    overflow: "hidden",
                                    background: "#fff",
                                    borderRadius: 20,
                                    boxShadow: "0 10px 40px rgba(15, 35, 63, 0.04)",
                                    border: "1px solid #e2e8f0",
                                    animationDelay: `${150 + i * 150}ms`, // Staggers each card by 150ms
                                }}
                            >
                                {/* Card Header */}
                                <div
                                    style={{
                                        padding: "20px 28px",
                                        background: "#f8fafc",
                                        borderBottom: "1px solid #f1f5f9",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 12,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                fontSize: "0.72rem",
                                                fontWeight: 800,
                                                padding: "6px 14px",
                                                borderRadius: 100,
                                                background: ex.badgeBg,
                                                color: ex.badgeColor,
                                                letterSpacing: "0.04em",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            {ex.badge}
                                        </div>
                                        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>{ex.type}</h2>
                                    </div>
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "6px 14px",
                                            borderRadius: 100,
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            border: `1px solid ${urgencyStyle.color}30`,
                                            background: urgencyStyle.bg,
                                            color: urgencyStyle.color,
                                            letterSpacing: "0.03em",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                background: urgencyStyle.color,
                                            }}
                                        />
                                        {ex.urgency}
                                    </div>
                                </div>

                                {/* Before / After Grid */}
                                <div className="example-grid">
                                    {/* Before */}
                                    <div style={{ padding: "32px 28px" }}>
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 800,
                                                color: "#94a3b8",
                                                letterSpacing: "0.06em",
                                                textTransform: "uppercase",
                                                marginBottom: 16,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Original Letter (extract)
                                        </div>
                                        <p
                                            style={{
                                                fontSize: "0.85rem",
                                                color: "#475569",
                                                lineHeight: 1.7,
                                                fontStyle: "italic",
                                                padding: "20px",
                                                background: "#f8fafc",
                                                borderRadius: 14,
                                                border: "1px solid #e2e8f0",
                                                margin: 0,
                                            }}
                                        >
                                            &ldquo;{ex.before}&rdquo;
                                        </p>
                                    </div>

                                    {/* Arrow divider */}
                                    <div className="arrow-container">
                                        <div
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: "50%",
                                                background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                boxShadow: "0 6px 16px rgba(18,161,166,0.25)",
                                            }}
                                        >
                                            <svg className="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* After */}
                                    <div style={{ padding: "32px 28px", background: "linear-gradient(135deg,#f0fdfd,#e6faf9)" }}>
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 800,
                                                color: "#12A1A6",
                                                letterSpacing: "0.06em",
                                                textTransform: "uppercase",
                                                marginBottom: 16,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Plain English Summary
                                        </div>
                                        <p
                                            style={{
                                                fontSize: "0.95rem",
                                                color: "#0e4f52",
                                                lineHeight: 1.7,
                                                fontWeight: 600,
                                                margin: 0,
                                            }}
                                        >
                                            {ex.after}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="animate-fade-up" style={{ textAlign: "center", marginTop: 56, animationDelay: "600ms" }}>
                    <button 
                        onClick={handleRouteToUpload} 
                        className="btn-primary" 
                        style={{ 
                            maxWidth: 360, 
                            margin: "0 auto",
                            padding: "16px 32px",
                            borderRadius: 14,
                            background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                            color: "#fff",
                            border: "none",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            boxShadow: "0 8px 24px rgba(18,161,166,0.3)",
                            transition: "transform 0.2s, box-shadow 0.2s"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 12px 28px rgba(18,161,166,0.4)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(18,161,166,0.3)";
                        }}
                    >
                        Try It With Your Letter — Free →
                    </button>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 16, fontWeight: 500 }}>
                        No sign-up needed · Results in seconds
                    </p>
                </div>
            </div>
        </div>
    );
}