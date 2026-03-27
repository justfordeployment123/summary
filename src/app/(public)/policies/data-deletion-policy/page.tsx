"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DataDeletionPolicyPage() {
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
                            Data Deletion Policy
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
                            We believe sensitive documents should be handled carefully and kept only for as long as necessary. Our approach is built
                            around data minimisation and automatic deletion.
                        </p>
                    </div>

                    {/* Policy Grid */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* Card 1 */}
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
                                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Our Deletion Principle</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                Explain My Letter is designed to minimise document retention. Uploaded files are used only for the purpose of
                                generating the requested output and are not stored longer than needed for that purpose.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "300ms" }}>
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
                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Automatic Deletion</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                Documents uploaded through the platform are automatically deleted after processing <strong>(within 24 hours)</strong>{" "}
                                in accordance with our strict operational controls.
                            </p>
                        </div>

                        {/* Card 3 (Contact) */}
                        <div
                            className="policy-card animate-fade-up"
                            style={{ animationDelay: "450ms", background: "linear-gradient(135deg,#f0fdfd,#e6faf9)", borderColor: "#b2eeec" }}
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
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>User Requests</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#0e4f52", lineHeight: 1.7, margin: 0 }}>
                                If you would like confirmation relating to data handling, or have deletion-related requests, please reach out to our
                                support team.
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
                    animationDelay: "600ms",
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
