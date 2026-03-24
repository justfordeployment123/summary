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

            <div style={{ flex: 1, minWidth: 0 }}>
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
    return (
        <div className="faq-item">
            <button className="faq-question" onClick={() => setOpen((o) => !o)}>
                <span>{q}</span>
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#12A1A6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.25s", flexShrink: 0 }}
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            {open && <div className="faq-answer">{a}</div>}
        </div>
    );
}
