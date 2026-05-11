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

const socialLinks = [
    {
        label: "Instagram",
        href: "https://www.instagram.com/explainmyletter/",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
        ),
    },
    {
        label: "TikTok",
        href: "https://www.tiktok.com/@explainmyletter",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
            </svg>
        ),
    },
    {
        label: "Facebook",
        href: "https://www.facebook.com/profile.php?id=61583161348907",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        ),
    },
];

export function Footer() {
    const footerLinks = [
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
                        <img src="/white-horizontal-logo.png" alt="ExplainMyLetter" style={{ width: 200 }} />
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

                {/* Social Media Icons */}
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24 }}>
                    {socialLinks.map((s) => (
                        <a
                            key={s.label}
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={s.label}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.65)",
                                textDecoration: "none",
                                transition: "all 0.25s ease",
                                border: "1px solid rgba(255,255,255,0.1)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "linear-gradient(135deg,#12A1A6,#54D6D4)";
                                e.currentTarget.style.color = "#fff";
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 6px 20px rgba(18,161,166,0.4)";
                                e.currentTarget.style.border = "1px solid transparent";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                            }}
                        >
                            {s.icon}
                        </a>
                    ))}
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
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>
                        Registered with the Information Commissioner’s Office (ICO)
                    </p>
                </div>
            </div>
        </footer>
    );
}
