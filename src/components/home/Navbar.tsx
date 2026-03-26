"use client";

import { useState, useEffect } from "react";
import type { NavbarProps, ViewState } from "@/types/home";

export function Navbar({ onReset, onScrollToUpload, view }: NavbarProps) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);

    const viewOrder: Record<ViewState, number> = {
        form: 0,
        summary: 1,
        processing_payment: 1,
        completed: 2,
    };

    const steps: { v: ViewState; label: string }[] = [
        { v: "form", label: "Upload" },
        { v: "summary", label: "Summary" },
        { v: "completed", label: "Breakdown" },
    ];

    const navTabs = [
        { label: "How it Works", href: "#how-it-works" },
        { label: "Pricing", href: "#pricing" },
        { label: "Examples", href: "#examples" },
        { label: "Why Choose Us", href: "#why-choose-us" },
        { label: "FAQs", href: "#faqs" },
    ];

    const handleTabClick = (href: string) => {
        setMobileMenuOpen(false);
        const id = href.replace("#", "");
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <nav
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.95)",
                backdropFilter: "blur(20px)",
                borderBottom: scrolled ? "1px solid rgba(15,35,63,0.08)" : "1px solid transparent",
                transition: "all 0.3s",
                boxShadow: scrolled ? "0 2px 20px rgba(15,35,63,0.06)" : "none",
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    padding: "0 24px",
                    height: 66,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                {/* Logo */}
                <button
                    onClick={onReset}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                >
                    <img src="/horizontal-logo.png" alt="ExplainMyLetter" style={{ height: 50, borderRadius: 10 }} />
                </button>

                {/* Form view — nav tabs */}
                {view === "form" && (
                    <>
                        {/* Desktop tabs */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav">
                            {navTabs.map((tab) => (
                                <button
                                    key={tab.label}
                                    onClick={() => handleTabClick(tab.href)}
                                    style={{
                                        padding: "8px 14px",
                                        background: "none",
                                        border: "none",
                                        fontFamily: "Raleway,sans-serif",
                                        fontWeight: 600,
                                        fontSize: "0.82rem",
                                        color: "#0F233F",
                                        cursor: "pointer",
                                        borderRadius: 8,
                                        transition: "all 0.2s",
                                        whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(18,161,166,0.08)";
                                        (e.currentTarget as HTMLButtonElement).style.color = "#12A1A6";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = "none";
                                        (e.currentTarget as HTMLButtonElement).style.color = "#0F233F";
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <button
                                onClick={onScrollToUpload}
                                style={{
                                    padding: "9px 20px",
                                    borderRadius: 10,
                                    background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                    color: "#fff",
                                    border: "none",
                                    fontFamily: "Raleway,sans-serif",
                                    fontWeight: 800,
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: "0 3px 12px rgba(18,161,166,0.35)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                Upload FREE Here →
                            </button>

                            {/* Mobile hamburger */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="mobile-menu-btn"
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 8,
                                    display: "none",
                                }}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F233F" strokeWidth="2.5">
                                    {mobileMenuOpen ? (
                                        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </>
                )}

                {/* Progress steps (non-form views) */}
                {view !== "form" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                            {steps.map((s, i) => {
                                const cur = viewOrder[view] ?? 0;
                                const state = cur > i ? "done" : cur === i ? "active" : "pending";
                                return (
                                    <div key={s.v} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div className={`step-pill ${state}`}>
                                            {state === "done" ? "✓ " : `${i + 1}. `}
                                            {s.label}
                                        </div>
                                        {i < 2 && <div style={{ width: 20, height: 1, background: "rgba(15,35,63,0.1)" }} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile dropdown menu */}
            {view === "form" && mobileMenuOpen && (
                <div
                    style={{
                        background: "#fff",
                        borderTop: "1px solid #f1f5f9",
                        padding: "12px 24px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        boxShadow: "0 8px 24px rgba(15,35,63,0.08)",
                    }}
                >
                    {navTabs.map((tab) => (
                        <button
                            key={tab.label}
                            onClick={() => handleTabClick(tab.href)}
                            style={{
                                padding: "12px 16px",
                                background: "none",
                                border: "none",
                                fontFamily: "Raleway,sans-serif",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                color: "#0F233F",
                                cursor: "pointer",
                                borderRadius: 10,
                                textAlign: "left",
                                transition: "all 0.2s",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-menu-btn { display: flex !important; }
                }
            `}</style>
        </nav>
    );
}
