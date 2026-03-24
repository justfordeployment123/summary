"use client";

import { useState, useEffect } from "react";
import type { NavbarProps, ViewState } from "@/types/home";

export function Navbar({ onReset, onScrollToUpload, view }: NavbarProps) {
    const [scrolled, setScrolled] = useState(false);

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

    return (
        <nav
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(0,255,255,0.85)",
                backdropFilter: "blur(20px)",
                borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                transition: "all 0.3s",
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
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}
                >
                    <img
                        src="/horizontal-logo.png"
                        alt="ExplainMyLetter"
                        style={{
                            // width: 100,
                            height: 100,
                            borderRadius: 10,
                        }}
                    />
                    {/* <div>
                        <div style={{ fontWeight: 900, color: "#fff", fontSize: "0.95rem", lineHeight: 1 }}>ExplainMyLetter</div>
                        <div style={{ fontSize: "0.65rem", color: "#54D6D4", fontWeight: 700, letterSpacing: "0.04em", marginTop: 1 }}>
                            Clarity. Confidence. Next Steps.
                        </div>
                    </div> */}
                </button>

                {/* Form view nav */}
                {view === "form" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                        {/* <a className="nav-link">How It Works</a>
                        <a className="nav-link">Pricing</a> */}
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
                            }}
                        >
                            Upload Free →
                        </button>
                    </div>
                )}

                {/* Progress steps */}
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
                                        {i < 2 && <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.15)" }} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
