"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/home/primitives";
import { formatPrice } from "@/lib/homeUtils";
import type { UpsellCardProps, FAQItemProps } from "@/types/home";

const UPSELL_ACCENTS = [
    { bg: "#e0e7ff", icon: "#4f46e5" },
    { bg: "#ccfbf1", icon: "#0f766e" },
    { bg: "#fef3c7", icon: "#b45309" },
];

export function UpsellCard({ upsell, price, selected, onToggle, index }: UpsellCardProps) {
    const accent = UPSELL_ACCENTS[index % UPSELL_ACCENTS.length];

    return (
        <button type="button" onClick={onToggle} className={`upsell-card${selected ? " selected" : ""}`}>
            <div
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    flexShrink: 0,
                    transition: "background 0.2s",
                    background: selected ? "linear-gradient(135deg,#12A1A6,#54D6D4)" : accent.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={selected ? "#fff" : accent.icon}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </div>

            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: selected ? "#12A1A6" : "#0F233F" }}>{upsell.name}</span>
                    {price > 0 && (
                        <span
                            style={{
                                fontSize: "0.8rem",
                                fontWeight: 800,
                                padding: "2px 10px",
                                borderRadius: 8,
                                flexShrink: 0,
                                background: selected ? "rgba(84,214,212,0.15)" : "#f1f5f9",
                                color: selected ? "#12A1A6" : "#475569",
                            }}
                        >
                            +{formatPrice(price)}
                        </span>
                    )}
                </div>
                {upsell.description && <p style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5, margin: 0 }}>{upsell.description}</p>}
            </div>

            <div
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    transition: "all 0.2s",
                    border: selected ? "none" : "1.5px solid #cbd5e1",
                    background: selected ? "linear-gradient(135deg,#12A1A6,#54D6D4)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {selected && <CheckIcon size={12} />}
            </div>
        </button>
    );
}

export function FAQItem({ q, a }: FAQItemProps) {
    const [open, setOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: "#fff",
                borderRadius: 16,
                border: open ? "1.5px solid #54D6D4" : "1.5px solid #e2e8f0",
                boxShadow: open
                    ? "0 8px 32px rgba(18,161,166,0.12)"
                    : isHovered
                      ? "0 4px 20px rgba(15,35,63,0.06)"
                      : "0 2px 10px rgba(15,35,63,0.02)",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                overflow: "hidden",
            }}
        >
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    width: "100%",
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: 16,
                    fontFamily: "inherit",
                }}
            >
                <span
                    style={{
                        fontSize: "1.05rem",
                        fontWeight: 800,
                        color: open ? "#12A1A6" : "#0F233F",
                        transition: "color 0.2s",
                        lineHeight: 1.4,
                    }}
                >
                    {q}
                </span>
                <div
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: open ? "rgba(84,214,212,0.15)" : isHovered ? "#e2e8f0" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.25s ease",
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={open ? "#12A1A6" : "#64748b"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{
                            transform: open ? "rotate(180deg)" : "rotate(0)",
                            transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>
            </button>

            {/* Smooth height transition using CSS Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateRows: open ? "1fr" : "0fr",
                    transition: "grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                <div style={{ overflow: "hidden" }}>
                    <div style={{ padding: "0 24px 24px", fontSize: "0.95rem", color: "#64748b", lineHeight: 1.65 }}>{a}</div>
                </div>
            </div>
        </div>
    );
}
