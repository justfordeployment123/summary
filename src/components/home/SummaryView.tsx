"use client";

import { Elements } from "@stripe/react-stripe-js";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Spinner, CheckIcon } from "@/components/home/primitives";
import { UpsellCard } from "@/components/home/cards";
import { EmbeddedPaymentForm } from "@/components/home/EmbeddedPaymentForm";
import { URGENCY_CONFIG, formatPrice, markdownToHtml } from "@/lib/homeUtils";
import type { SummaryViewProps } from "@/types/home";
import { FeedbackModal, FeedbackButton } from "@/components/home/FeedbackModal";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Small reusable atoms ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                color: "#12A1A6",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 10,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
            }}
        >
            <span style={{ display: "inline-block", width: 18, height: 2, background: "linear-gradient(90deg,#12A1A6,#54D6D4)", borderRadius: 2 }} />
            {children}
        </div>
    );
}

function Divider() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#e2e8f0,transparent)" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#cbd5e1" }} />
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#e2e8f0)" }} />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SummaryView({
    summaryData,
    firstName,
    upsells,
    categoryId,
    selectedUpsells,
    setSelectedUpsells,
    disclaimerAcknowledged,
    setDisclaimerAcknowledged,
    getBasePrice,
    getUpsellPrice,
    getTotalPrice,
    clientSecret,
    showPaymentForm,
    isCreatingPaymentIntent,
    isPaymentProcessing,
    setIsPaymentProcessing,
    handleProceedToPayment,
    handlePaymentSuccess,
    handlePaymentError,
    onHidePaymentForm,
    uploadStatus,
    isError,
    handleReset,
    paymentRef,
    view,
    pollStatus,
    pollCount,
    jobId,
    accessToken,
}: SummaryViewProps) {
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [disclaimerText, setDisclaimerText] = useState<string>();
    const [checkboxLabel, setCheckboxLabel] = useState<string>();

    useEffect(() => {
        const fetchDisclaimerText = async () => {
            try {
                const response = await fetch("/api/disclaimer");
                // console.log("Fetched disclaimer response:", response);
                const data = await response.json();
                // console.log("Fetched disclaimer text:", data.disclaimer_text);
                // console.log("Fetched disclaimer checkbox label:", data.disclaimer_checkbox_label);
                setDisclaimerText(data.disclaimer_text);
                setCheckboxLabel(data.disclaimer_checkbox_label);
            } catch {
                console.error("Failed to fetch disclaimer text");
            }
        };
        fetchDisclaimerText();
    }, []);

    const urgency = summaryData?.urgency && URGENCY_CONFIG[summaryData.urgency] ? URGENCY_CONFIG[summaryData.urgency] : URGENCY_CONFIG["Routine"];

    const categoryUpsells = upsells.filter((u) => {
        const price = u.category_prices?.[categoryId];
        return typeof price === "number" && price > 0;
    });

    const toggleUpsell = (id: string) =>
        setSelectedUpsells(selectedUpsells.includes(id) ? selectedUpsells.filter((u) => u !== id) : [...selectedUpsells, id]);

    return (
        <div
            style={{
                maxWidth: 780,
                margin: "0 auto",
                padding: "56px 24px 80px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                fontFamily: "'Raleway', sans-serif",
            }}
        >
            {/* ═══════════════════════════════════════════════════
                CARD 1 — Free Summary
            ═══════════════════════════════════════════════════ */}
            <div
                className="anim-fadeUp"
                style={{
                    borderRadius: 24,
                    background: "#fff",
                    boxShadow: "0 2px 0 0 #e2e8f0, 0 8px 40px rgba(15,35,63,0.08)",
                    overflow: "hidden",
                    border: "1px solid #f1f5f9",
                }}
            >
                {/* Card header bar */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #0a1f36 0%, #0F233F 60%, #133352 100%)",
                        padding: "32px 36px 28px",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Decorative glow */}
                    <div
                        style={{
                            position: "absolute",
                            top: -60,
                            right: -60,
                            width: 200,
                            height: 200,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(84,214,212,0.15) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }}
                    />

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <div>
                            {/* Label pill */}
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    background: "rgba(84,214,212,0.15)",
                                    border: "1px solid rgba(84,214,212,0.3)",
                                    borderRadius: 99,
                                    padding: "4px 14px 4px 8px",
                                    marginBottom: 14,
                                }}
                            >
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#54D6D4", boxShadow: "0 0 6px #54D6D4" }} />
                                <span
                                    style={{
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        color: "#54D6D4",
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Free Summary Ready
                                </span>
                            </div>

                            <h2 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#fff", lineHeight: 1.15, margin: 0, letterSpacing: "-0.02em" }}>
                                Your Letter,{" "}
                                <span
                                    style={{
                                        background: "linear-gradient(90deg,#54D6D4,#38c9c9)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    Explained
                                </span>
                            </h2>
                            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", marginTop: 6, fontWeight: 500 }}>
                                Hello <strong style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>{firstName}</strong> — here&apos;s what
                                your letter says in plain English.
                            </p>
                        </div>

                        {/* Urgency badge */}
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 18px",
                                borderRadius: 12,
                                background: urgency.bg,
                                border: `1.5px solid ${urgency.border}`,
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: urgency.dot,
                                    boxShadow: `0 0 8px ${urgency.dot}`,
                                }}
                            />
                            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: urgency.text, letterSpacing: "0.03em" }}>
                                {summaryData.urgency}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Summary body */}
                <div style={{ paddingTop: "38px", paddingLeft: 36, paddingRight: 10 }}>
                    <SectionLabel>Plain English Summary</SectionLabel>

                    <div dangerouslySetInnerHTML={{ __html: markdownToHtml(summaryData.summary) }} />
                    <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
                        <FeedbackButton onClick={() => setFeedbackOpen(true)} label="Rate this summary" />
                    </div>
                </div>
                {/* Inside Card 1 — after the summary <div dangerouslySetInnerHTML...> */}
            </div>

            {/* ═══════════════════════════════════════════════════
                DISCLAIMER banner
            ═══════════════════════════════════════════════════ */}
            <div
                className="anim-fadeUp-1"
                style={{
                    padding: "16px 20px",
                    borderRadius: 16,
                    background: "linear-gradient(135deg,#fffbeb,#fef9ee)",
                    border: "1px solid #fde68a",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: "#fef3c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p style={{ fontSize: "0.83rem", color: "#78350f", lineHeight: 1.65, margin: 0 }}>
                    <strong style={{ color: "#92400e" }}>Important:</strong> {disclaimerText}
                </p>
            </div>

            {/* ═══════════════════════════════════════════════════
                CARD 2 — Full Breakdown / Payment
            ═══════════════════════════════════════════════════ */}
            <div
                ref={paymentRef}
                className="anim-fadeUp-2"
                style={{
                    borderRadius: 24,
                    background: "#fff",
                    boxShadow: "0 2px 0 0 #e2e8f0, 0 12px 48px rgba(15,35,63,0.09)",
                    overflow: "hidden",
                    border: "1px solid #f1f5f9",
                }}
            >
                {/* Dark header */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #0a1f36 0%, #0F233F 60%, #133352 100%)",
                        padding: "32px 36px 30px",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            bottom: -80,
                            right: -40,
                            width: 220,
                            height: 220,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(84,214,212,0.10) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }}
                    />
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(84,214,212,0.12)",
                            border: "1px solid rgba(84,214,212,0.25)",
                            borderRadius: 99,
                            padding: "4px 14px",
                            marginBottom: 14,
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#54D6D4" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#54D6D4", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            Optional Upgrade
                        </span>
                    </div>

                    <h3 style={{ fontSize: "1.65rem", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        Get Your Full{" "}
                        <span
                            style={{
                                background: "linear-gradient(90deg,#54D6D4,#38c9c9)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Breakdown
                        </span>
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500, lineHeight: 1.5 }}>
                        Section-by-section analysis with actions, deadlines &amp; next steps — all in plain English.
                    </p>
                </div>

                <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 28 }}>
                    {/* What's included */}
                    <div>
                        <SectionLabel>What&apos;s Included</SectionLabel>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                            {[
                                { icon: "�", text: "Detailed explanation" },
                                { icon: "📄", text: "Section-by-section structured breakdown" },
                                { icon: "⚠️", text: "Key risks explained" },
                                { icon: "📅", text: "Important dates highlighted" },
                                { icon: "➡️", text: "What could happen next" },
                                { icon: "❓", text: "Questions to ask" },
                                { icon: "✅", text: "Possible next steps" },
                                { icon: "⬇️", text: "Downloadable PDF, Word & text" },
                            ].map(({ icon, text }) => (
                                <div
                                    key={text}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "12px 16px",
                                        borderRadius: 14,
                                        background: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 10,
                                            background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            fontSize: "1rem",
                                        }}
                                    >
                                        {icon}
                                    </div>
                                    <span style={{ fontSize: "0.84rem", color: "#334155", fontWeight: 600, lineHeight: 1.4 }}>{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upsells */}
                    {categoryUpsells.length > 0 && !showPaymentForm && (
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <SectionLabel>Optional Add-Ons</SectionLabel>
                                {selectedUpsells.length > 0 && (
                                    <span
                                        style={{
                                            fontSize: "0.72rem",
                                            fontWeight: 700,
                                            color: "#12A1A6",
                                            background: "rgba(84,214,212,0.12)",
                                            border: "1px solid rgba(84,214,212,0.25)",
                                            padding: "3px 12px",
                                            borderRadius: 99,
                                        }}
                                    >
                                        {selectedUpsells.length} selected
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {categoryUpsells.map((u, i) => (
                                    <UpsellCard
                                        key={u._id}
                                        upsell={u}
                                        price={getUpsellPrice(u)}
                                        selected={selectedUpsells.includes(u._id)}
                                        onToggle={() => toggleUpsell(u._id)}
                                        index={i}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Price breakdown */}
                    <div
                        style={{
                            borderRadius: 18,
                            background: "linear-gradient(135deg,#f0fdfd,#e8faf9)",
                            border: "1.5px solid #b2eeec",
                            padding: "22px 24px",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: -30,
                                right: -30,
                                width: 100,
                                height: 100,
                                borderRadius: "50%",
                                background: "radial-gradient(circle,rgba(84,214,212,0.15) 0%,transparent 70%)",
                                pointerEvents: "none",
                            }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.88rem", color: "#475569", fontWeight: 600 }}>Detailed Breakdown</span>
                                <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0F233F" }}>{formatPrice(getBasePrice())}</span>
                            </div>

                            {selectedUpsells.map((id) => {
                                const u = upsells.find((u) => u._id === id);
                                if (!u) return null;
                                return (
                                    <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.88rem", color: "#475569", fontWeight: 600 }}>{u.name}</span>
                                        <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#12A1A6" }}>
                                            +{formatPrice(getUpsellPrice(u))}
                                        </span>
                                    </div>
                                );
                            })}

                            <div style={{ height: 1, background: "rgba(18,161,166,0.2)", margin: "4px 0" }} />

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 800, color: "#0F233F", fontSize: "1rem" }}>Total Due</span>
                                <span
                                    style={{
                                        fontWeight: 900,
                                        color: "#12A1A6",
                                        fontSize: "1.75rem",
                                        letterSpacing: "-0.03em",
                                        lineHeight: 1,
                                    }}
                                >
                                    {formatPrice(getTotalPrice())}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer checkbox */}
                    {!showPaymentForm && (
                        <label
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 14,
                                padding: "16px 20px",
                                borderRadius: 16,
                                background: "#f8fafc",
                                border: "1.5px solid #e2e8f0",
                                cursor: "pointer",
                                transition: "border-color 0.2s",
                            }}
                        >
                            <div
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 6,
                                    border: `2px solid ${disclaimerAcknowledged ? "#12A1A6" : "#cbd5e1"}`,
                                    background: disclaimerAcknowledged ? "linear-gradient(135deg,#12A1A6,#54D6D4)" : "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    marginTop: 1,
                                    transition: "all 0.2s",
                                    position: "relative",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={disclaimerAcknowledged}
                                    onChange={(e) => setDisclaimerAcknowledged(e.target.checked)}
                                    style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0 }}
                                />
                                {disclaimerAcknowledged && (
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: "0.86rem", color: "#475569", lineHeight: 1.65, fontWeight: 500 }}>
                                {/* I understand this is an Automated Technology-generated summary and not professional advice. I accept the{" "} */}
                                {checkboxLabel ||
                                    "I understand this is an Automated Technology-generated summary and not professional advice. I accept the"}
                                <span style={{ color: "#12A1A6", fontWeight: 700 }}>Terms of Service</span>.
                            </span>
                        </label>
                    )}

                    {/* Error banner */}
                    {uploadStatus && isError && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "14px 18px",
                                borderRadius: 14,
                                background: "#fff1f2",
                                border: "1px solid #fecdd3",
                                color: "#be123c",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{ flexShrink: 0 }}
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4m0 4h.01" />
                            </svg>
                            {uploadStatus}
                        </div>
                    )}

                    {/* Payment form or CTA */}
                    {showPaymentForm && clientSecret ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                                <span
                                    style={{
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        color: "#94a3b8",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                    }}
                                >
                                    Secure Payment
                                </span>
                                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                            </div>

                            <div
                                style={{
                                    borderRadius: 18,
                                    border: "1.5px solid #e2e8f0",
                                    padding: "22px",
                                    background: "#fafbfc",
                                }}
                            >
                                <Elements
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret,
                                        appearance: {
                                            theme: "stripe",
                                            variables: {
                                                colorPrimary: "#12A1A6",
                                                colorBackground: "#ffffff",
                                                colorText: "#0F233F",
                                                colorDanger: "#dc2626",
                                                fontFamily: "'Raleway', 'Helvetica Neue', sans-serif",
                                                borderRadius: "10px",
                                                spacingUnit: "4px",
                                            },
                                            rules: {
                                                ".Input": { border: "1.5px solid #e2e8f0", boxShadow: "none", padding: "11px 14px" },
                                                ".Input:focus": { border: "1.5px solid #12A1A6", boxShadow: "0 0 0 3px rgba(84,214,212,0.15)" },
                                                ".Label": { fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "6px" },
                                                ".Tab": { border: "1.5px solid #e2e8f0", borderRadius: "10px" },
                                                ".Tab--selected": { border: "1.5px solid #12A1A6", backgroundColor: "#f0fdfd" },
                                            },
                                        },
                                    }}
                                >
                                    <EmbeddedPaymentForm
                                        clientSecret={clientSecret}
                                        totalPrice={getTotalPrice()}
                                        onSuccess={handlePaymentSuccess}
                                        onError={handlePaymentError}
                                        isProcessing={isPaymentProcessing}
                                        setIsProcessing={setIsPaymentProcessing}
                                    />
                                </Elements>
                            </div>

                            <button
                                type="button"
                                onClick={onHidePaymentForm}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    fontFamily: "Raleway, sans-serif",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    padding: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
                                </svg>
                                Back to options
                            </button>
                        </div>
                    ) : (
                        !showPaymentForm && (
                            <button
                                type="button"
                                onClick={handleProceedToPayment}
                                disabled={!disclaimerAcknowledged || isCreatingPaymentIntent}
                                style={{
                                    width: "100%",
                                    padding: "17px 28px",
                                    borderRadius: 16,
                                    background:
                                        !disclaimerAcknowledged || isCreatingPaymentIntent
                                            ? "linear-gradient(135deg,#94a3b8,#cbd5e1)"
                                            : "linear-gradient(135deg,#0F233F,#1a3a5c)",
                                    color: "#fff",
                                    border: "none",
                                    fontFamily: "Raleway, sans-serif",
                                    fontWeight: 800,
                                    fontSize: "1rem",
                                    cursor: !disclaimerAcknowledged || isCreatingPaymentIntent ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 10,
                                    boxShadow:
                                        !disclaimerAcknowledged || isCreatingPaymentIntent
                                            ? "none"
                                            : "0 4px 20px rgba(15,35,63,0.3), 0 1px 0 rgba(255,255,255,0.1) inset",
                                    transition: "all 0.2s",
                                    position: "relative",
                                    overflow: "hidden",
                                    letterSpacing: "0.01em",
                                }}
                            >
                                {/* Teal accent stripe */}
                                {disclaimerAcknowledged && !isCreatingPaymentIntent && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: 4,
                                            background: "linear-gradient(180deg,#54D6D4,#12A1A6)",
                                            borderRadius: "16px 0 0 16px",
                                        }}
                                    />
                                )}
                                {isCreatingPaymentIntent ? (
                                    <>
                                        <Spinner size={18} /> Preparing payment…
                                    </>
                                ) : (
                                    <>
                                        Pay {formatPrice(getTotalPrice())} — Get Full Breakdown
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        )
                    )}

                    {/* Trust row */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 16,
                            flexWrap: "wrap",
                            paddingTop: 4,
                        }}
                    >
                        {[
                            {
                                icon: (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                ),
                                text: "Secured by Stripe",
                            },
                            { icon: null, text: "Apple Pay & Google Pay" },
                            { icon: null, text: "VAT applied where applicable" },
                        ].map(({ icon, text }, i) => (
                            <span
                                key={text}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontSize: "0.75rem",
                                    color: "#94a3b8",
                                    fontWeight: 600,
                                }}
                            >
                                {i > 0 && <span style={{ color: "#e2e8f0", marginRight: 8 }}>·</span>}
                                {icon}
                                {text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                PROCESSING overlay card
            ═══════════════════════════════════════════════════ */}
            {view === "processing_payment" && (
                <div
                    className="anim-fadeIn"
                    style={{
                        borderRadius: 24,
                        background: "#fff",
                        boxShadow: "0 8px 40px rgba(15,35,63,0.1)",
                        border: "1px solid #f1f5f9",
                        overflow: "hidden",
                    }}
                >
                    <div style={{ padding: "56px 40px", textAlign: "center" }}>
                        {/* Spinner ring */}
                        <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 24px" }}>
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 8,
                                    border: "3px solid transparent",
                                    borderTopColor: "#12A1A6",
                                    borderRightColor: "rgba(84,214,212,0.4)",
                                    borderRadius: "50%",
                                    animation: "spin 0.9s linear infinite",
                                }}
                            />
                        </div>

                        <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0F233F", marginBottom: 8, letterSpacing: "-0.02em" }}>
                            Preparing Your Breakdown
                        </h3>
                        <p
                            className="pulse"
                            style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.65, marginBottom: 28, maxWidth: 360, margin: "0 auto 28px" }}
                        >
                            {pollStatus}
                        </p>

                        {/* Progress bar */}
                        <div
                            style={{
                                height: 6,
                                borderRadius: 99,
                                background: "#f1f5f9",
                                maxWidth: 260,
                                margin: "0 auto 12px",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    height: "100%",
                                    width: "65%",
                                    borderRadius: 99,
                                    background: "linear-gradient(90deg,#12A1A6,#54D6D4)",
                                    animation: "pulse 1.8s ease-in-out infinite",
                                }}
                            />
                        </div>
                        {pollCount > 0 && <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Checking… ({pollCount})</p>}
                    </div>
                </div>
            )}

            {/* Reset link */}
            {view === "summary" && (
                <button
                    onClick={handleReset}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        fontFamily: "Raleway, sans-serif",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        justifyContent: "center",
                        padding: "8px",
                        transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5m7-7l-7 7 7 7" />
                    </svg>
                    Upload a different letter
                </button>
            )}
            {/* Feedback Modal — free summary */}
            <FeedbackModal
                isOpen={feedbackOpen}
                onClose={() => setFeedbackOpen(false)}
                surveyType="free_summary"
                jobId={jobId} // already in your props
                accessToken={accessToken} // already in your props
            />
        </div>
    );
}
