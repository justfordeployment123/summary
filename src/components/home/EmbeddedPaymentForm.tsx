"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/homeUtils";
import type { EmbeddedPaymentFormProps } from "@/types/home";

export function EmbeddedPaymentForm({ totalPrice, onSuccess, onError, isProcessing, setIsProcessing }: EmbeddedPaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Coupon state
    const [couponCode, setCouponCode] = useState("");
    const [couponStatus, setCouponStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
    const [couponMessage, setCouponMessage] = useState<string | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);

    const finalPrice = Math.max(0, totalPrice - discountAmount);

    const handleApplyCoupon = async () => {
        const trimmed = couponCode.trim().toUpperCase();
        if (!trimmed) return;

        setCouponStatus("loading");
        setCouponMessage(null);

        try {
            const res = await fetch("/api/validate-coupon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ couponCode: trimmed, totalPrice }),
            });

            const data = await res.json();

            if (!res.ok || !data.valid) {
                setCouponStatus("invalid");
                setCouponMessage(data.message || "Invalid or expired coupon code.");
                setDiscountAmount(0);
            } else {
                setCouponStatus("valid");
                setCouponMessage(data.message || "Coupon applied!");
                setDiscountAmount(data.discountAmount ?? 0);
            }
        } catch {
            setCouponStatus("invalid");
            setCouponMessage("Could not validate coupon. Please try again.");
            setDiscountAmount(0);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponCode("");
        setCouponStatus("idle");
        setCouponMessage(null);
        setDiscountAmount(0);
    };

    const handlePay = async () => {
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        const { error: submitError } = await elements.submit();
        if (submitError) {
            const msg = submitError.message || "Please check your payment details.";
            setErrorMessage(msg);
            onError(msg);
            setIsProcessing(false);
            return;
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href },
            redirect: "if_required",
        });

        if (error) {
            const msg = error.message || "Payment failed. Please try again.";
            setErrorMessage(msg);
            onError(msg);
            setIsProcessing(false);
        } else if (paymentIntent?.id) {
            setIsProcessing(false);
            onSuccess(paymentIntent.id);
        } else {
            const msg = "Payment status unknown. Please contact support.";
            setErrorMessage(msg);
            onError(msg);
            setIsProcessing(false);
        }
    };

    const applyDisabled = !couponCode.trim() || couponStatus === "loading";

    return (
        <div style={{ marginBottom: 16 }}>
            <PaymentElement
                options={{
                    layout: "tabs",
                    fields: { billingDetails: "auto" },
                }}
            />

            {/* ── Coupon Section ── */}
            <div style={{ marginTop: 20 }}>
                <label
                    style={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#94a3b8",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                        fontFamily: "inherit",
                    }}
                >
                    Coupon Code
                </label>

                {couponStatus === "valid" ? (
                    /* Applied pill */
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: 12,
                            background: "linear-gradient(135deg, #f0fdfa, #e6faf8)",
                            border: "1.5px solid #99f6e4",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    background: "#14b8a6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f766e", letterSpacing: "0.04em", fontFamily: "inherit" }}>
                                {couponCode.trim().toUpperCase()}
                            </span>
                            {couponMessage && (
                                <span style={{ fontSize: "0.81rem", color: "#0d9488", fontWeight: 500, fontFamily: "inherit" }}>
                                    — {couponMessage}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: "2px 6px",
                                borderRadius: 6,
                                fontFamily: "inherit",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    /* Input + button stacked vertically */
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => {
                                setCouponCode(e.target.value);
                                if (couponStatus !== "idle") {
                                    setCouponStatus("idle");
                                    setCouponMessage(null);
                                    setDiscountAmount(0);
                                }
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                            placeholder="Enter coupon code"
                            style={{
                                width: "100%",
                                height: 44,
                                padding: "0 14px",
                                borderRadius: 10,
                                border: couponStatus === "invalid" ? "1.5px solid #fca5a5" : "1.5px solid #e2e8f0",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#0f172a",
                                background: "#fff",
                                fontFamily: "inherit",
                                outline: "none",
                                letterSpacing: "0.04em",
                                boxSizing: "border-box",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#12A1A6";
                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(84,214,212,0.15)";
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = couponStatus === "invalid" ? "#fca5a5" : "#e2e8f0";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={applyDisabled}
                            style={{
                                width: "100%",
                                height: 44,
                                padding: "0 22px",
                                borderRadius: 10,
                                border: "none",
                                fontFamily: "inherit",
                                fontWeight: 700,
                                fontSize: "0.875rem",
                                cursor: applyDisabled ? "not-allowed" : "pointer",
                                background: applyDisabled ? "#f1f5f9" : "linear-gradient(135deg, #0F233F, #1a3a5c)",
                                color: applyDisabled ? "#94a3b8" : "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: applyDisabled ? "none" : "0 2px 10px rgba(15,35,63,0.28)",
                                letterSpacing: "0.01em",
                                transition: "background 0.15s, box-shadow 0.15s",
                            }}
                        >
                            {couponStatus === "loading" ? (
                                <svg
                                    style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : (
                                "Apply Coupon"
                            )}
                        </button>
                    </div>
                )}

                {/* Invalid error message */}
                {couponStatus === "invalid" && couponMessage && (
                    <div
                        style={{
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.78rem",
                            color: "#dc2626",
                            fontWeight: 600,
                            fontFamily: "inherit",
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                        </svg>
                        {couponMessage}
                    </div>
                )}
            </div>

            {/* ── Price Summary (visible only when discount applied) ── */}
            {discountAmount > 0 && (
                <div
                    style={{
                        marginTop: 14,
                        borderRadius: 12,
                        border: "1.5px solid #e2e8f0",
                        background: "#f8fafc",
                        overflow: "hidden",
                        fontFamily: "inherit",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "9px 16px",
                            borderBottom: "1px solid #f1f5f9",
                        }}
                    >
                        <span style={{ fontSize: "0.83rem", color: "#64748b", fontWeight: 500 }}>Original price</span>
                        <span style={{ fontSize: "0.83rem", color: "#64748b", fontWeight: 600 }}>{formatPrice(totalPrice)}</span>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "9px 16px",
                            borderBottom: "1.5px solid #e2e8f0",
                            background: "rgba(240,253,250,0.5)",
                        }}
                    >
                        <span style={{ fontSize: "0.83rem", color: "#0d9488", fontWeight: 600 }}>Discount</span>
                        <span style={{ fontSize: "0.83rem", color: "#0d9488", fontWeight: 700 }}>−{formatPrice(discountAmount)}</span>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "11px 16px",
                        }}
                    >
                        <span style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 800 }}>Total</span>
                        <span style={{ fontSize: "1rem", color: "#12A1A6", fontWeight: 900, letterSpacing: "-0.02em" }}>
                            {formatPrice(finalPrice)}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Payment Error Banner ── */}
            {errorMessage && (
                <div
                    style={{
                        marginTop: 18,
                        padding: "13px 16px",
                        borderRadius: 12,
                        background: "#fff1f2",
                        border: "1.5px solid #fecdd3",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontFamily: "inherit",
                    }}
                >
                    <svg style={{ width: 17, height: 17, color: "#dc2626", flexShrink: 0, marginTop: 1 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span style={{ fontSize: "0.84rem", color: "#be123c", fontWeight: 600, lineHeight: 1.5 }}>{errorMessage}</span>
                </div>
            )}

            {/* ── Pay Button ── */}
            <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing || !stripe || !elements}
                style={{
                    width: "100%",
                    marginTop: 18,
                    height: 52,
                    padding: "0 16px",
                    borderRadius: 14,
                    border: "none",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    cursor: isProcessing || !stripe || !elements ? "not-allowed" : "pointer",
                    background:
                        isProcessing || !stripe || !elements
                            ? "#e2e8f0"
                            : "linear-gradient(135deg, #0d9488, #14b8a6)",
                    color: isProcessing || !stripe || !elements ? "#94a3b8" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow:
                        isProcessing || !stripe || !elements
                            ? "none"
                            : "0 4px 16px rgba(13,148,136,0.3), 0 1px 0 rgba(255,255,255,0.12) inset",
                    letterSpacing: "0.01em",
                    transition: "all 0.2s",
                }}
            >
                {isProcessing ? (
                    <>
                        <svg style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Processing payment…
                    </>
                ) : (
                    `Pay ${formatPrice(finalPrice)} — Get Breakdown →`
                )}
            </button>
        </div>
    );
}