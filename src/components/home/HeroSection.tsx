"use client";

import type { HeroSectionProps } from "@/types/home";

export function HeroSection({ onScrollToUpload }: HeroSectionProps) {
    return (
        <section className="hero-mesh" style={{ padding: "80px 24px 100px", textAlign: "center" }}>
            <div
                style={{
                    position: "absolute",
                    width: 400,
                    height: 400,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(84,214,212,0.08) 0%, transparent 70%)",
                    top: "-100px",
                    right: "-100px",
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    width: 300,
                    height: 300,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(18,161,166,0.1) 0%, transparent 70%)",
                    bottom: "-80px",
                    left: "-60px",
                    pointerEvents: "none",
                }}
            />

            <div style={{ maxWidth: 780, margin: "0 auto", position: "relative", zIndex: 1 }}>
               

                <h1
                    className="anim-fadeUp-1 hero-title"
                    style={{ fontSize: "3.2rem", fontWeight: 900, lineHeight: 1.1, color: "#fff", marginBottom: 24, letterSpacing: "-0.02em" }}
                >
                    Your Letters,
                    <br />
                    <span
                        style={{
                            background: "linear-gradient(90deg,#54D6D4,#4FCCD2)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Finally Explained
                    </span>
                </h1>

                <p
                    className="anim-fadeUp-2"
                    style={{
                        fontSize: "1.15rem",
                        color: "rgba(255,255,255,0.75)",
                        lineHeight: 1.7,
                        maxWidth: 560,
                        margin: "0 auto 40px",
                        fontWeight: 500,
                    }}
                >
                    Upload any legal, medical, or government letter and get a plain-English summary in under 30 seconds — completely free.
                </p>

                <div className="anim-fadeUp-3" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 52 }}>
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
                            transition: "all 0.25s",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        Upload your Letter Free
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>

                {/* <div className="anim-fadeUp-4 stat-row" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                    {[
                        { val: "30s", label: "Average summary time" },
                        { val: "4.9★", label: "User satisfaction" },
                        { val: "100%", label: "Encrypted & private" },
                    ].map((s) => (
                        <div key={s.val} className="stat-card" style={{ minWidth: 140, flex: "1 1 120px", maxWidth: 200 }}>
                            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#54D6D4", lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", marginTop: 6, fontWeight: 600 }}>{s.label}</div>
                        </div>
                    ))}
                </div> */}
            </div>
        </section>
    );
}
