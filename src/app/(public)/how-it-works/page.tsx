"use client";

import { useRouter } from "next/navigation";

const steps = [
    {
        n: "01",
        title: "Choose Letter Type",
        desc: "Select from Legal, Medical, Government, Financial and more — our system tailors its analysis to your category.",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
    {
        n: "02",
        title: "Upload Your Document",
        desc: "Drag & drop your PDF, DOCX, or photo. We accept JPG and PNG too — even photos of letters work great.",
        icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    },
    {
        n: "03",
        title: "Get Your Free Summary",
        desc: "Our system reads every word and gives you a plain-English summary in seconds, plus an urgency rating.",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
        n: "04",
        title: "Unlock Full Breakdown",
        desc: "Optional paid upgrade gives you a section-by-section analysis with actions, deadlines, and possible next steps.",
        icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    },
];

export default function HowItWorksPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ minHeight: "calc(100vh - 66px)", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
            {/* Custom keyframes for animations */}
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .step-card {
                    padding: 32px;
                    background: #fff;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(15, 35, 63, 0.03);
                    border: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .step-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(15, 35, 63, 0.08);
                }
            `}</style>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: "60px 24px 80px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    {/* Page Header */}
                    <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 60, animationDelay: "0ms" }}>
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
                            How it Works
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
                            Four simple steps to clarity
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
                            No jargon. No confusion. Just answers. Here is how Explain My Letter works from start to finish.
                        </p>
                    </div>

                    {/* Steps Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 24 }}>
                        {steps.map((s, i) => (
                            <div key={s.n} className="step-card animate-fade-up" style={{ animationDelay: `${150 + i * 150}ms` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 14,
                                            background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
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
                                            <path d={s.icon} />
                                        </svg>
                                    </div>
                                    <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#12A1A6", letterSpacing: "0.06em", opacity: 0.5 }}>
                                        {s.n}
                                    </span>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0F233F", marginBottom: 8 }}>{s.title}</h2>
                                    <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                                </div>
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
                    background: "linear-gradient(135deg, #0F233F, #1a3a5c)", // Fallback if hero-mesh isn't applying
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
