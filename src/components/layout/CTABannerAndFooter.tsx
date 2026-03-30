"use client";

import type { CTABannerProps } from "@/types/home";
import Link from "next/link";

export function CTABanner({ onScrollToUpload }: CTABannerProps) {
    return (
        <section className="hero-mesh" style={{ padding: "80px 24px", textAlign: "center", background: "linear-gradient(135deg, #0F233F, #1a3a5c)" }}>
            <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: "2.4rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.15 }}>
                    Got a letter you
                    <br />
                    can&apos;t understand?
                </h2>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", marginBottom: 36, lineHeight: 1.6 }}>
                    Upload it now and get a plain-English summary in seconds — free, no account needed.
                </p>

                <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                        onClick={onScrollToUpload}
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
    );
}

export function Footer() {
    const footerLinks = [
        // Added the leading '/' to all policy links
        { label: "Privacy Policy", href: "/policies/privacy-policy" },
        { label: "Terms of Service", href: "/policies/terms-of-service" },
        { label: "Data Deletion Policy", href: "/policies/data-deletion-policy" },
        { label: "Cookies Policy", href: "/policies/cookie-policy" },
        { label: "Contact Us", href: "/contact" },
    ];

    return (
        <footer style={{ background: "#0F233F", padding: "40px 24px 28px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src="/logo-icon.png" alt="ExplainMyLetter" style={{ width: 34, height: 34, filter: "brightness(0) invert(1)" }} />
                        <div>
                            <div style={{ fontWeight: 900, color: "#fff", fontSize: "0.95rem" }}>ExplainMyLetter</div>
                            <div style={{ fontSize: "0.7rem", color: "#54D6D4", fontWeight: 600, letterSpacing: "0.04em" }}>
                                Clarity. Confidence. Next Steps.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {footerLinks.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                className="nav-link"
                                style={{
                                    fontSize: "0.8rem",
                                    color: "rgba(255,255,255,0.7)",
                                    textDecoration: "none",
                                    transition: "color 0.2s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#54D6D4")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
                <div
                    style={{
                        borderTop: "1px solid rgba(255,255,255,0.07)",
                        paddingTop: 20,
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                    }}
                >
                    <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>© 2025 ExplainMyLetter. All rights reserved.</p>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", maxWidth: 440, textAlign: "right" }}>
                        Summaries are for informational purposes only and do not constitute legal, financial, medical, or professional advice.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            console.log("Triggering Sentry test error...");
                            throw new Error("Sentry Test Error from ExplainMyLetter!");
                        }}
                        style={{ background: "red", color: "white", padding: "10px" }}
                    >
                        Trigger Sentry
                    </button>
                </div>
            </div>
        </footer>
    );
}
