"use client";

import { useRouter } from "next/navigation";

const highlights = [
    {
        icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
        title: "Secure, Encrypted Processing",
        desc: "Every document is handled through secure, encrypted systems. Your files are never exposed or accessible to unauthorised parties.",
    },
    {
        icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
        title: "Automatic Document Deletion",
        desc: "Uploaded files are automatically deleted within 24 hours of processing. We are built around data minimisation — we keep only what is necessary.",
    },
    {
        icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
        title: "No Advertising or Data Resale",
        desc: "We do not sell, rent, or trade your personal data. We do not use advertising cookies or profile you for third-party marketing.",
    },
    {
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
        title: "UK GDPR-Focused Data Handling",
        desc: "Our data practices are designed around UK GDPR principles. You have rights to access, correct, and request deletion of your data.",
    },
    {
        icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9",
        title: "Built for UK Letters",
        desc: "Designed specifically for UK correspondence — HMRC, NHS, DWP, council letters, courts, landlords, banks and more.",
    },
    {
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
        title: "Instant Results, No Account Needed",
        desc: "Get a plain-English summary in under 30 seconds. No registration, no subscription, no sign-up barriers.",
    },
];

export default function WhyChooseUsPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ minHeight: "calc(100vh - 66px)", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
            {/* Custom keyframes and card styles */}
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .feature-card {
                    padding: 32px 28px;
                    background: #fff;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(15, 35, 63, 0.03);
                    border: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .feature-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(15, 35, 63, 0.08);
                }
            `}</style>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: "60px 24px 80px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    {/* Page Header */}
                    <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 52, animationDelay: "0ms" }}>
                        <span
                            className="feature-chip"
                            style={{
                                marginBottom: 14,
                                display: "inline-flex",
                            }}
                        >
                            Why Choose Us
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
                            Clarity-first, privacy-first
                        </h1>
                        <p
                            style={{
                                fontSize: "1.1rem",
                                color: "#64748b",
                                marginTop: 16,
                                maxWidth: 560,
                                margin: "12px auto 0",
                                lineHeight: 1.6,
                            }}
                        >
                            Explain My Letter is a clarity-first platform built for people who want to understand important documents — without the
                            jargon, confusion, or worry.
                        </p>
                    </div>

                    {/* Intro banner */}
                    <div
                        className="animate-fade-up"
                        style={{
                            padding: "32px 40px",
                            borderRadius: 20,
                            background: "linear-gradient(135deg,#0F233F,#1a3a5c)",
                            marginBottom: 40,
                            display: "flex",
                            alignItems: "center",
                            gap: 32,
                            flexWrap: "wrap",
                            boxShadow: "0 20px 40px rgba(15, 35, 63, 0.1)",
                            animationDelay: "150ms",
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 240 }}>
                            <div
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 800,
                                    color: "#54D6D4",
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    marginBottom: 10,
                                }}
                            >
                                What We Do
                            </div>
                            <p style={{ fontSize: "1.05rem", color: "#fff", fontWeight: 600, lineHeight: 1.65, margin: 0 }}>
                                We transform complex, formal communication into simple, structured explanations — giving you{" "}
                                <strong style={{ color: "#54D6D4" }}>clarity, confidence, and control</strong> over what comes next.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {["Secure & Encrypted", "Auto-Deleted in 24hr", "No Data Resale", "UK GDPR Focused"].map((tag) => (
                                <div
                                    key={tag}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: 100,
                                        background: "rgba(84,214,212,0.15)",
                                        border: "1px solid rgba(84,214,212,0.3)",
                                        color: "#54D6D4",
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.03em",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    ✓ {tag}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Feature grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
                        {highlights.map((h, i) => (
                            <div key={h.title} className="feature-card animate-fade-up" style={{ animationDelay: `${300 + i * 100}ms` }}>
                                <div
                                    style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        marginBottom: 4,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d={h.icon} />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0F233F", lineHeight: 1.3, margin: 0 }}>{h.title}</h2>
                                <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.65, margin: 0 }}>{h.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Integrated CTA Banner at the bottom */}
            <section
                className="hero-mesh animate-fade-up"
                style={{
                    padding: "80px 24px",
                    textAlign: "center",
                    background: "linear-gradient(135deg, #0F233F, #1a3a5c)",
                    animationDelay: "800ms",
                }}
            >
                <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
                    <h2 style={{ fontSize: "2.4rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.15 }}>
                        Got a letter you
                        <br />
                        can&apos;t understand?
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.05rem", marginBottom: 36, lineHeight: 1.6 }}>
                        Upload it now and get a plain-English summary in seconds — free, no account needed.
                    </p>
                    <div className="anim-fadeUp-3" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 52 }}>
                        <button
                            onClick={handleRouteToUpload} // Or onScrollToUpload depending on your props
                            style={{
                                padding: "15px 32px",
                                borderRadius: 14,
                                background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                color: "#fff",
                                border: "none",
                                fontFamily: "Raleway,sans-serif",
                                fontWeight: 800,
                                fontSize: "1rem",
                                cursor: "pointer",
                                boxShadow: "0 6px 24px rgba(18,161,166,0.4)",
                                transition: "all 0.25s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 10px 32px rgba(18,161,166,0.6)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 6px 24px rgba(18,161,166,0.4)";
                            }}
                        >
                            Upload your Letter Free
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                style={{ transition: "transform 0.2s" }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
