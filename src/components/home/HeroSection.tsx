"use client";

import type { HeroSectionProps } from "@/types/home";
import { useEffect, useRef } from "react";

const beforeText = `"You are hereby notified that a claim has been issued against you in the County Court Business Centre for the sum of £1,250. You must respond to this claim within 14 days of service. Failure to respond may result in judgment being entered against you without further notice."`;

const afterText = `The County Court Business Centre has issued a formal legal claim against you for £1,250. You must respond within 14 days. This is a formal legal step, not a warning. If you ignore it, a default judgment may be registered against you, affecting your credit. You should review the claim details and decide on your legal response quickly.`;

const floatingCategories = [
    "Medical / Health Letters",
    "Money Owed Letters",
    "Court / Legal Letters",
    "Benefit Letters",
    "Parking Fine Letters",
    "Tax Letters",
];

export function HeroSection({ onScrollToUpload }: HeroSectionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (window.innerWidth < 768) return;
        const container = containerRef.current;
        if (!container) return;
        const NUM = 14;
        const rand = (a: number, b: number) => Math.random() * (b - a) + a;

        // Only spawn in the left and right wings, avoiding the centre
        const spawnZones = [
            { xMin: 1, xMax: 18 }, // left wing
            { xMax: 99, xMin: 76 }, // right wing
        ];

        const slots: { el: HTMLDivElement; zone: (typeof spawnZones)[0] }[] = [];

        for (let i = 0; i < NUM; i++) {
            const zone = spawnZones[i % 2];
            const el = document.createElement("div");
            el.style.cssText = `
            position:absolute;
            color:rgba(180,200,210,0.18);
            font-family:'Raleway',sans-serif;
            font-size:${rand(0.62, 0.82)}rem;
            font-weight:700;
            letter-spacing:0.09em;
            text-transform:uppercase;
            white-space:nowrap;
            opacity:0;
            user-select:none;
            top:${rand(6, 88)}%;
            left:${rand(zone.xMin, zone.xMax)}%;
            transition: opacity 1.8s ease, transform 0s linear;
        `;
            container.appendChild(el);
            slots.push({ el, zone });
        }

        function animateSlot(slot: { el: HTMLDivElement; zone: (typeof spawnZones)[0] }) {
            const { el, zone } = slot;
            const text = floatingCategories[Math.floor(Math.random() * floatingCategories.length)];
            const startX = rand(zone.xMin, zone.xMax);
            const direction = zone.xMin < 30 ? 1 : -1; // left zone drifts right, right zone drifts left
            const driftPx = rand(30, 70) * direction;
            const duration = rand(8000, 14000);
            const top = rand(6, 88);

            el.textContent = text;
            el.style.top = `${top}%`;
            el.style.left = `${startX}%`;
            el.style.transform = `translateX(0px)`;
            el.style.transition = `opacity 1.8s ease`;
            el.style.opacity = "1";

            // Start drifting
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.style.transition = `opacity 1.8s ease, transform ${duration}ms linear`;
                    el.style.transform = `translateX(${driftPx}px)`;
                });
            });

            // Fade out partway through
            setTimeout(() => {
                el.style.opacity = "0";
            }, duration * 0.65);

            // Restart after full cycle
            setTimeout(
                () => {
                    el.style.transition = "none";
                    el.style.transform = "translateX(0px)";
                    animateSlot(slot);
                },
                duration + rand(1000, 3000),
            );
        }

        slots.forEach((slot, i) => {
            setTimeout(() => animateSlot(slot), i * rand(200, 700));
        });

        return () => {
            container.innerHTML = "";
        };
    }, []);
    return (
        <section
            style={{
                position: "relative",
                padding: "80px 24px 110px",
                textAlign: "center",
                background: "linear-gradient(160deg, #0a2a3a 0%, #0d3545 40%, #0b2e3e 100%)",
                overflow: "hidden",
                fontFamily: "'Raleway', sans-serif",
            }}
        >
            {/* Mesh / noise overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                        "radial-gradient(ellipse 80% 60% at 70% 10%, rgba(84,214,212,0.10) 0%, transparent 60%), " +
                        "radial-gradient(ellipse 60% 50% at 10% 80%, rgba(18,161,166,0.10) 0%, transparent 60%)",
                    pointerEvents: "none",
                }}
            />

            {/* Subtle dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    pointerEvents: "none",
                }}
            />
            <div ref={containerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} />

            <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
                {/* Eyebrow */}
                <p
                    style={{
                        fontSize: "0.85rem",
                        color: "rgba(255,255,255,0.5)",
                        letterSpacing: "0.06em",
                        marginBottom: 18,
                        fontWeight: 600,
                        textTransform: "uppercase",
                    }}
                >
                    If you've ever read a letter twice and still felt unsure…
                </p>

                {/* Headline */}
                <h1
                    style={{
                        fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
                        fontWeight: 900,
                        lineHeight: 1.1,
                        color: "#fff",
                        marginBottom: 20,
                        letterSpacing: "-0.02em",
                    }}
                >
                    Confusing Letter? <br />
                    <span
                        style={{
                            background: "linear-gradient(90deg, #54D6D4 0%, #38c9c9 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Let's Break it Down.
                    </span>
                </h1>

                {/* Subheadline */}
                <p
                    style={{
                        fontSize: "1.05rem",
                        color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.7,
                        maxWidth: 580,
                        margin: "0 auto 52px",
                        fontWeight: 500,
                    }}
                >
                    Upload any letter — <span style={{ color: "rgba(255,255,255,0.85)" }}>legal, medical, financial or official</span> — and get a
                    clear, plain-English breakdown{" "}
                    <span
                        style={{
                            display: "inline-block",
                            background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                            color: "#fff",
                            borderRadius: 6,
                            padding: "1px 10px",
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            verticalAlign: "middle",
                            textTransform: "uppercase",
                        }}
                    >
                        FREE
                    </span>
                </p>

                {/* Before / After Cards */}
                <div className="before-after-grid">
                    {/* BEFORE card */}
                    <div
                        style={{
                            background: "rgba(255,255,255,0.96)",
                            borderRadius: "20px",
                            padding: "28px 28px 28px",
                            textAlign: "left",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
                            position: "relative",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: -14,
                                left: 20,
                                background: "#1a3a4a",
                                color: "#fff",
                                borderRadius: 8,
                                padding: "4px 14px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                            }}
                        >
                            Before
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                            <span
                                style={{
                                    background: "#e8f4f8",
                                    color: "#12A1A6",
                                    borderRadius: 6,
                                    padding: "3px 10px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                Legal
                            </span>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a2b35" }}>County Court Letter</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span
                                style={{
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    color: "#94a3b8",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                }}
                            >
                                Original Letter (Extract)
                            </span>
                        </div>

                        <p
                            style={{
                                fontSize: "0.82rem",
                                color: "#4a5568",
                                lineHeight: 1.65,
                                fontStyle: "italic",
                                margin: 0,
                                fontFamily: "'Georgia', serif",
                            }}
                        >
                            {beforeText}
                        </p>
                    </div>

                    {/* Arrow — rotates to down arrow on mobile */}
                    <div className="arrow-divider">
                        {/* Desktop: right arrow */}
                        <div
                            className="arrow-desktop"
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 4px 18px rgba(18,161,166,0.45)",
                                flexShrink: 0,
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </div>
                        {/* Mobile: down arrow */}
                        <div
                            className="arrow-mobile"
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                display: "none",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 4px 18px rgba(18,161,166,0.45)",
                                margin: "0 auto",
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
                            </svg>
                        </div>
                    </div>

                    {/* AFTER card */}
                    <div
                        style={{
                            background: "rgba(12, 42, 58, 0.92)",
                            border: "1.5px solid rgba(84,214,212,0.25)",
                            borderRadius: "20px",
                            padding: "28px 28px 28px",
                            textAlign: "left",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
                            position: "relative",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: -14,
                                left: 20,
                                background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                color: "#fff",
                                borderRadius: 8,
                                padding: "4px 14px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                            }}
                        >
                            After
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                            <div
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    border: "2px solid #54D6D4",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#54D6D4" }} />
                            </div>
                            <span
                                style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    color: "#54D6D4",
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                }}
                            >
                                Plain English Summary
                            </span>
                        </div>

                        <p
                            style={{
                                fontSize: "0.88rem",
                                color: "rgba(255,255,255,0.85)",
                                lineHeight: 1.7,
                                margin: "0 0 22px",
                            }}
                        >
                            {afterText}
                        </p>
                    </div>
                </div>

                {/* Bottom CTA */}
                <button
                    onClick={onScrollToUpload}
                    style={{
                        padding: "15px 36px",
                        borderRadius: 14,
                        background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                        color: "#fff",
                        border: "none",
                        fontFamily: "Raleway, sans-serif",
                        fontWeight: 800,
                        fontSize: "1rem",
                        cursor: "pointer",
                        boxShadow: "0 6px 28px rgba(18,161,166,0.45)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 10px 32px rgba(18,161,166,0.55)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 6px 28px rgba(18,161,166,0.45)";
                    }}
                >
                    Let's See What It <span style={{ fontWeight: 400, fontStyle: "italic", margin: "0 4px" }}>Really</span> Means
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
            </div>

            <style>{`
                .before-after-grid {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    gap: 0;
                    align-items: center;
                    max-width: 860px;
                    margin: 0 auto 52px;
                }

                .arrow-divider {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 16px;
                }

                @media (max-width: 640px) {
                    .before-after-grid {
                        grid-template-columns: 1fr;
                        gap: 0;
                        margin-bottom: 36px;
                    }

                    .arrow-divider {
                        padding: 16px 0;
                    }

                    .arrow-desktop {
                        display: none !important;
                    }

                    .arrow-mobile {
                        display: flex !important;
                    }
                }
            `}</style>
        </section>
    );
}
