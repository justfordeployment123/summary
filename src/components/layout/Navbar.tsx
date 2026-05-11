"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);

    const navTabs = [
        { label: "How it Works", href: "/how-it-works" },
        { label: "Pricing", href: "/pricing" },
        { label: "Examples", href: "/examples" },
        { label: "Why Choose Us", href: "/why-choose-us" },
        { label: "FAQs", href: "/faqs" },
    ];
    const handleUploadClick = () => {
        setMobileMenuOpen(false);
        if (pathname === "/") {
            window.dispatchEvent(new CustomEvent("navbar:reset"));
        } else {
            router.push("/#upload");
        }
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
                {/* <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}></Link> */}
                <button onClick={handleUploadClick}>
                    <img src="/horizontal-logo.png" alt="ExplainMyLetter" style={{ height: 50, borderRadius: 10 }} />
                </button>

                {/* Desktop tabs */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav">
                    {navTabs.map((tab) => (
                        <Link
                            key={tab.label}
                            href={tab.href}
                            style={{
                                padding: "8px 14px",
                                fontFamily: "Raleway,sans-serif",
                                fontWeight: 600,
                                fontSize: "0.82rem",
                                color: pathname === tab.href ? "#12A1A6" : "#0F233F",
                                textDecoration: "none",
                                borderRadius: 8,
                                transition: "all 0.2s",
                                whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(18,161,166,0.08)";
                                (e.currentTarget as HTMLAnchorElement).style.color = "#12A1A6";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.background = "none";
                                (e.currentTarget as HTMLAnchorElement).style.color = pathname === tab.href ? "#12A1A6" : "#0F233F";
                            }}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Upload button — hidden on mobile, shown on desktop */}
                    <button
                        onClick={handleUploadClick}
                        className="desktop-upload-btn"
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
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "none" }}
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
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
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
                        <Link
                            key={tab.label}
                            href={tab.href}
                            onClick={() => setMobileMenuOpen(false)}
                            style={{
                                padding: "12px 16px",
                                fontFamily: "Raleway,sans-serif",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                color: pathname === tab.href ? "#12A1A6" : "#0F233F",
                                textDecoration: "none",
                                borderRadius: 10,
                                transition: "all 0.2s",
                            }}
                        >
                            {tab.label}
                        </Link>
                    ))}

                    {/* Upload button inside mobile menu */}
                    <button
                        onClick={handleUploadClick}
                        style={{
                            marginTop: 8,
                            padding: "13px 20px",
                            borderRadius: 10,
                            background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                            color: "#fff",
                            border: "none",
                            fontFamily: "Raleway,sans-serif",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                            cursor: "pointer",
                            boxShadow: "0 3px 12px rgba(18,161,166,0.35)",
                            width: "100%",
                        }}
                    >
                        Upload FREE Here →
                    </button>
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .desktop-upload-btn { display: none !important; }
                    .mobile-menu-btn { display: flex !important; }
                }
            `}</style>
        </nav>
    );
}
