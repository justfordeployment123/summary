"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Spinner, CheckIcon } from "@/components/home/primitives";
import { UpsellCard } from "@/components/home/cards";
import { EmbeddedPaymentForm } from "@/components/home/EmbeddedPaymentForm";
import { URGENCY_CONFIG, formatPrice } from "@/lib/homeUtils";
import type { SummaryViewProps } from "@/types/home";

// Stripe promise — initialised once at module level (never inside a render)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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
    // Stripe
    clientSecret,
    showPaymentForm,
    isCreatingPaymentIntent,
    isPaymentProcessing,
    setIsPaymentProcessing,
    handleProceedToPayment,
    handlePaymentSuccess,
    handlePaymentError,
    onHidePaymentForm,
    // Status
    uploadStatus,
    isError,
    handleReset,
    // Refs & view
    paymentRef,
    view,
    pollStatus,
    pollCount,
}: SummaryViewProps) {
    const urgency = summaryData?.urgency && URGENCY_CONFIG[summaryData.urgency] ? URGENCY_CONFIG[summaryData.urgency] : URGENCY_CONFIG["Routine"];

    const categoryUpsells = upsells.filter((u) => {
        const price = u.category_prices?.[categoryId];
        return typeof price === "number" && price > 0;
    });

    const toggleUpsell = (id: string) =>
        setSelectedUpsells(selectedUpsells.includes(id) ? selectedUpsells.filter((u) => u !== id) : [...selectedUpsells, id]);

    return (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
            {/* ── Free Summary Card ── */}
            <div className="glass-card anim-fadeUp" style={{ overflow: "hidden" }}>
                <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div>
                            <div
                                style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 800,
                                    color: "#12A1A6",
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    marginBottom: 6,
                                }}
                            >
                                Free Summary Ready
                            </div>
                            <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0F233F" }}>Your Letter Explained</h2>
                            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: 4 }}>
                                Hello {firstName} — here&apos;s what your letter says in plain English.
                            </p>
                        </div>
                        <div className="urgency-badge" style={{ background: urgency.bg, color: urgency.text, borderColor: urgency.border }}>
                            <div className="urgency-dot" style={{ background: urgency.dot }} />
                            {summaryData.urgency}
                        </div>
                    </div>
                </div>
                <div style={{ padding: "24px 32px" }}>
                    <p style={{ color: "#334155", lineHeight: 1.8, fontSize: "0.95rem" }}>{summaryData.summary}</p>
                </div>
            </div>

            {/* ── Disclaimer Banner ── */}
            <div
                className="anim-fadeUp-1"
                style={{
                    padding: "18px 22px",
                    borderRadius: 16,
                    background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                    border: "1px solid #fde68a",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p style={{ fontSize: "0.85rem", color: "#92400e", lineHeight: 1.6 }}>
                    <strong>Important:</strong> This service provides an AI-generated summary for general informational purposes only. It does not
                    constitute legal, financial, medical, or professional advice. Always seek advice from a qualified professional before acting on
                    any document.
                </p>
            </div>

            {/* ── Full Breakdown / Payment Card ── */}
            <div ref={paymentRef} className="glass-card anim-fadeUp-2" style={{ overflow: "hidden" }}>
                {/* Card header */}
                <div style={{ padding: "0", background: "linear-gradient(135deg,#0F233F,#1a3a5c)", borderRadius: "20px 20px 0 0" }}>
                    <div style={{ padding: "24px 32px" }}>
                        <div
                            style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                color: "#54D6D4",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                marginBottom: 8,
                            }}
                        >
                            Optional Upgrade
                        </div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fff" }}>Get Your Full Breakdown</h3>
                        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                            Section-by-section analysis with actions, deadlines & next steps.
                        </p>
                    </div>
                </div>

                <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
                    {/* What's included */}
                    <div>
                        <div
                            style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                color: "#12A1A6",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                marginBottom: 14,
                            }}
                        >
                            What&apos;s Included
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                            {[
                                "Section-by-section structured breakdown",
                                "Required actions & key deadlines",
                                "Plain-English clause explanations",
                                "Downloadable PDF, Word & text",
                            ].map((f) => (
                                <div key={f} className="check-item">
                                    <div className="check-icon">
                                        <CheckIcon size={11} />
                                    </div>
                                    <span style={{ color: "#475569" }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upsells — hidden once payment form is shown */}
                    {categoryUpsells.length > 0 && !showPaymentForm && (
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                <div
                                    style={{
                                        fontSize: "0.7rem",
                                        fontWeight: 800,
                                        color: "#12A1A6",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Optional Add-Ons
                                </div>
                                {selectedUpsells.length > 0 && (
                                    <span
                                        style={{
                                            fontSize: "0.72rem",
                                            fontWeight: 700,
                                            color: "#12A1A6",
                                            background: "rgba(84,214,212,0.12)",
                                            padding: "2px 10px",
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
                        style={{ padding: 20, borderRadius: 16, background: "linear-gradient(135deg,#f0fdfd,#e6faf9)", border: "1px solid #b2eeec" }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#475569" }}>
                                <span>Detailed Breakdown</span>
                                <span style={{ fontWeight: 700 }}>{formatPrice(getBasePrice())}</span>
                            </div>
                            {selectedUpsells.map((id) => {
                                const u = upsells.find((u) => u._id === id);
                                if (!u) return null;
                                return (
                                    <div
                                        key={id}
                                        style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#475569" }}
                                    >
                                        <span>{u.name}</span>
                                        <span style={{ fontWeight: 700 }}>+{formatPrice(getUpsellPrice(u))}</span>
                                    </div>
                                );
                            })}
                            <div
                                style={{
                                    borderTop: "1px solid rgba(18,161,166,0.2)",
                                    paddingTop: 12,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span style={{ fontWeight: 800, color: "#0F233F", fontSize: "0.95rem" }}>Total</span>
                                <span style={{ fontWeight: 900, color: "#12A1A6", fontSize: "1.4rem" }}>{formatPrice(getTotalPrice())}</span>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer checkbox — hidden once payment form is shown */}
                    {!showPaymentForm && (
                        <label
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 12,
                                padding: "16px 18px",
                                borderRadius: 14,
                                background: "#f8fafc",
                                border: "1.5px solid #e2e8f0",
                                cursor: "pointer",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={disclaimerAcknowledged}
                                onChange={(e) => setDisclaimerAcknowledged(e.target.checked)}
                                style={{ marginTop: 2 }}
                            />
                            <span style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                                I understand this is an AI-generated summary and not professional advice.
                            </span>
                        </label>
                    )}

                    {/* Error banner */}
                    {uploadStatus && isError && (
                        <div className="status-error">
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

                    {/* ── Embedded Stripe Payment Panel ── */}
                    {showPaymentForm && clientSecret ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Divider */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                                <span
                                    style={{
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        color: "#94a3b8",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                    }}
                                >
                                    Payment Details
                                </span>
                                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                            </div>

                            {/* Stripe Elements wrapper */}
                            <div style={{ borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "20px", background: "rgba(248,250,252,0.5)" }}>
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
                                                ".Label": { fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px" },
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

                            {/* Back button */}
                            <button
                                type="button"
                                onClick={onHidePaymentForm}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    fontFamily: "Raleway,sans-serif",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    padding: "4px",
                                }}
                            >
                                ← Back to options
                            </button>
                        </div>
                    ) : (
                        /* ── Proceed to Payment CTA ── */
                        !showPaymentForm && (
                            <button
                                type="button"
                                onClick={handleProceedToPayment}
                                disabled={!disclaimerAcknowledged || isCreatingPaymentIntent}
                                className="btn-primary"
                            >
                                {isCreatingPaymentIntent ? (
                                    <>
                                        <Spinner size={18} /> Preparing payment…
                                    </>
                                ) : (
                                    <>
                                        Pay {formatPrice(getTotalPrice())} — Get Breakdown{" "}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        )
                    )}

                    {/* Trust row */}
                    <div className="trust-row">
                        <span className="trust-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            Secured by Stripe
                        </span>
                        <span>·</span>
                        <span>Apple Pay & Google Pay</span>
                        <span>·</span>
                        <span>VAT applied where applicable</span>
                    </div>
                </div>
            </div>

            {/* ── Payment processing overlay (shown while polling) ── */}
            {view === "processing_payment" && (
                <div className="glass-card anim-fadeIn" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "52px 40px", textAlign: "center" }}>
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg,rgba(18,161,166,0.15),rgba(84,214,212,0.15))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 20px",
                            }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    border: "3px solid transparent",
                                    borderTopColor: "#12A1A6",
                                    borderRadius: "50%",
                                    animation: "spin 0.9s linear infinite",
                                }}
                            />
                        </div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0F233F", marginBottom: 8 }}>Preparing Your Breakdown</h3>
                        <p className="pulse" style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.6, marginBottom: 24 }}>
                            {pollStatus}
                        </p>
                        <div className="progress-track" style={{ maxWidth: 240, margin: "0 auto 12px" }}>
                            <div className="progress-fill" style={{ width: "65%" }} />
                        </div>
                        {pollCount > 0 && <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Checking… ({pollCount})</p>}
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
                        fontFamily: "Raleway,sans-serif",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        justifyContent: "center",
                        padding: "8px",
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5m7-7l-7 7 7 7" />
                    </svg>
                    Upload a different letter
                </button>
            )}
        </div>
    );
}
