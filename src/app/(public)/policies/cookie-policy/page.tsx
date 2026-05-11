"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CookiePolicyPage() {
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
                .policy-card {
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
                .policy-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(15, 35, 63, 0.08);
                }
            `}</style>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: "60px 24px 80px" }}>
                <div style={{ maxWidth: 860, margin: "0 auto" }}>
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
                            Privacy & Security
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
                            Cookie Policy
                        </h1>
                        <p
                            style={{
                                fontSize: "1.1rem",
                                color: "#64748b",
                                marginTop: 16,
                                maxWidth: 600,
                                margin: "16px auto 0",
                                lineHeight: 1.6,
                            }}
                        >
                            We use cookies in a limited and responsible way to help the website function properly and improve the user experience.
                        </p>
                    </div>

                    {/* Policy Grid */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* Card 1: What cookies are */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "150ms" }}>
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
                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>What Cookies Are</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                Cookies are small text files stored on your device when you visit a website. They help websites function, remember
                                preferences, and understand how pages are used.
                            </p>
                        </div>

                        {/* Card 2: How we use cookies */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "250ms" }}>
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
                                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>How We Use Cookies</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                We may use cookies for the following purposes:
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {[
                                    "Essential website functionality",
                                    "Security and session management",
                                    "Basic analytics to understand site performance and improve usability",
                                ].map((item, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        <div
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: "50%",
                                                background: "rgba(18,161,166,0.15)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                marginTop: 2,
                                            }}
                                        >
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="#12A1A6"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card 3: What we do not use cookies for */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "350ms" }}>
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
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>What We Do Not Use Cookies For</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                We do <strong style={{ color: "#0F233F" }}>not</strong> use cookies to sell your data, and we do{" "}
                                <strong style={{ color: "#0F233F" }}>not</strong> use advertising cookies to profile you for third-party marketing.
                            </p>
                        </div>

                        {/* Card 4: Managing cookies */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "450ms" }}>
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
                                        <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Managing Cookies</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                You can manage or disable cookies in your browser settings. Please note that disabling some cookies may affect how
                                certain parts of the site function.
                            </p>
                        </div>

                        {/* Card 5: Contact */}
                        <div
                            className="policy-card animate-fade-up"
                            style={{ animationDelay: "550ms", background: "linear-gradient(135deg,#f0fdfd,#e6faf9)", borderColor: "#b2eeec" }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        boxShadow: "0 4px 12px rgba(18,161,166,0.15)",
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
                                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Contact Us</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#0e4f52", lineHeight: 1.7, margin: 0 }}>
                                If you have questions about our use of cookies, please contact our support team.
                            </p>
                            <div style={{ marginTop: 8 }}>
                                <Link
                                    href="/contact"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "12px 24px",
                                        borderRadius: 10,
                                        background: "#fff",
                                        color: "#12A1A6",
                                        textDecoration: "none",
                                        fontWeight: 800,
                                        fontSize: "0.9rem",
                                        boxShadow: "0 2px 8px rgba(18,161,166,0.1)",
                                        border: "1px solid #b2eeec",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#12A1A6";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#fff";
                                        e.currentTarget.style.color = "#12A1A6";
                                    }}
                                >
                                    Contact Us →
                                </Link>
                                <span style={{ marginLeft: 16, fontSize: "0.85rem", color: "#0e6e71", fontWeight: 600 }}>
                                    info@explainmyletter.co.uk
                                </span>
                            </div>
                        </div>
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
                    animationDelay: "700ms",
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
                    <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                            onClick={handleRouteToUpload}
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
