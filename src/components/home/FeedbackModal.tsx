"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SurveyType = "free_summary" | "full_breakdown";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    surveyType: SurveyType;
    jobId: string;
    accessToken: string;
}

interface Ratings {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    q5: number;
}

// ─── Question definitions ─────────────────────────────────────────────────────

const QUESTIONS: Record<SurveyType, { label: string; questions: string[] }> = {
    free_summary: {
        label: "Free Summary",
        questions: [
            "How easy was the summary to understand?",
            "How helpful was the summary overall?",
            "How accurate did the summary feel?",
            "How clear was the urgency rating?",
            "How likely are you to unlock the full breakdown?",
        ],
    },
    full_breakdown: {
        label: "Full Breakdown",
        questions: [
            "How clearly did the breakdown explain your letter?",
            "How helpful were the key points and next steps?",
            "How much more useful was the full breakdown vs the free summary?",
            "How satisfied were you overall?",
            "How likely are you to use Explain My Letter again?",
        ],
    },
};

const RATING_LABELS: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Excellent",
};

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({
    value,
    onChange,
    disabled,
}: {
    value: number;
    onChange: (v: number) => void;
    disabled: boolean;
}) {
    const [hovered, setHovered] = useState(0);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= (hovered || value);
                return (
                    <button
                        key={star}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && onChange(star)}
                        onMouseEnter={() => !disabled && setHovered(star)}
                        onMouseLeave={() => !disabled && setHovered(0)}
                        style={{
                            background: "none",
                            border: "none",
                            padding: "2px",
                            cursor: disabled ? "default" : "pointer",
                            transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)",
                            transform: active && !disabled ? "scale(1.18)" : "scale(1)",
                            outline: "none",
                        }}
                        aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill={active ? "url(#starGrad)" : "none"}
                            stroke={active ? "none" : "#cbd5e1"}
                            strokeWidth="1.5"
                            style={{ transition: "all 0.2s ease", display: "block" }}
                        >
                            <defs>
                                <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#12A1A6" />
                                    <stop offset="100%" stopColor="#54D6D4" />
                                </linearGradient>
                            </defs>
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                    </button>
                );
            })}
            {(hovered || value) > 0 && (
                <span
                    style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#12A1A6",
                        marginLeft: 4,
                        opacity: 1,
                        transition: "opacity 0.2s",
                        minWidth: 60,
                    }}
                >
                    {RATING_LABELS[hovered || value]}
                </span>
            )}
        </div>
    );
}

// ─── Main FeedbackModal ───────────────────────────────────────────────────────

export function FeedbackModal({ isOpen, onClose, surveyType, jobId, accessToken }: FeedbackModalProps) {
    const [step, setStep] = useState<"form" | "success" | "error">("form");
    const [ratings, setRatings] = useState<Ratings>({ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 });
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    const config = QUESTIONS[surveyType];
    const allRated = Object.values(ratings).every((r) => r > 0);

    // Mount / unmount animation
    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimateIn(true));
            });
        } else {
            setAnimateIn(false);
            const t = setTimeout(() => {
                setMounted(false);
                setStep("form");
                setRatings({ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 });
                setComment("");
            }, 350);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    // Close on Escape
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose],
    );
    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!allRated || submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    job_id: jobId,
                    access_token: accessToken,
                    survey_type: surveyType,
                    rating_ease_of_understanding: ratings.q1,
                    rating_helpfulness: ratings.q2,
                    rating_accuracy: ratings.q3,
                    rating_urgency_clarity: ratings.q4,
                    rating_likelihood_to_upgrade: ratings.q5,
                    comment: comment.trim() || null,
                }),
            });

            if (res.ok || res.status === 409) {
                setStep("success");
            } else {
                setStep("error");
            }
        } catch {
            setStep("error");
        } finally {
            setSubmitting(false);
        }
    };

    if (!mounted) return null;

    return (
        <>
            <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(32px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes successPop {
                    0%   { transform: scale(0.5); opacity: 0; }
                    60%  { transform: scale(1.15); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                .feedback-q-row {
                    transition: background 0.2s, box-shadow 0.2s;
                }
                .feedback-q-row:hover {
                    background: #f8fafc !important;
                }
                .feedback-submit-btn:not(:disabled):hover {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 28px rgba(15,35,63,0.35), 0 1px 0 rgba(255,255,255,0.1) inset !important;
                }
                .feedback-submit-btn:not(:disabled):active {
                    transform: translateY(0);
                }
                textarea:focus {
                    outline: none;
                    border-color: #12A1A6 !important;
                    box-shadow: 0 0 0 3px rgba(84,214,212,0.15) !important;
                }
            `}</style>

            {/* Overlay */}
            <div
                ref={overlayRef}
                onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    background: animateIn ? "rgba(8,18,31,0.6)" : "rgba(8,18,31,0)",
                    backdropFilter: animateIn ? "blur(6px)" : "blur(0px)",
                    transition: "background 0.35s ease, backdrop-filter 0.35s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                }}
            >
                {/* Modal card */}
                <div
                    style={{
                        width: "100%",
                        maxWidth: 560,
                        maxHeight: "90vh",
                        overflowY: "auto",
                        borderRadius: 28,
                        background: "#fff",
                        boxShadow: "0 32px 80px rgba(8,18,31,0.25), 0 2px 0 0 #e2e8f0",
                        border: "1px solid #f1f5f9",
                        fontFamily: "'Raleway', sans-serif",
                        animation: animateIn ? "modalSlideUp 0.35s cubic-bezier(0.34,1.1,0.64,1) forwards" : "none",
                        opacity: animateIn ? 1 : 0,
                        scrollbarWidth: "none",
                    }}
                >
                    {/* ── Header ──────────────────────────────────────────────── */}
                    <div
                        style={{
                            background: "linear-gradient(135deg, #0a1f36 0%, #0F233F 60%, #133352 100%)",
                            padding: "28px 32px 24px",
                            borderRadius: "28px 28px 0 0",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Decorative glow */}
                        <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(84,214,212,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                {/* Badge */}
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(84,214,212,0.15)", border: "1px solid rgba(84,214,212,0.3)", borderRadius: 99, padding: "4px 12px 4px 8px", marginBottom: 12 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#54D6D4", boxShadow: "0 0 6px #54D6D4" }} />
                                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#54D6D4", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                        {config.label} Feedback
                                    </span>
                                </div>
                                <h2 style={{ fontSize: "1.45rem", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                                    How did we do?
                                </h2>
                                <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.45)", marginTop: 6, fontWeight: 500 }}>
                                    Takes 30 seconds — helps us improve for everyone.
                                </p>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.2s", color: "rgba(255,255,255,0.6)" }}
                                aria-label="Close"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Progress dots */}
                        <div style={{ display: "flex", gap: 4, marginTop: 20 }}>
                            {[1, 2, 3, 4, 5].map((i) => {
                                const rated = ratings[`q${i}` as keyof Ratings] > 0;
                                return (
                                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: rated ? "linear-gradient(90deg,#12A1A6,#54D6D4)" : "rgba(255,255,255,0.12)", transition: "background 0.3s ease" }} />
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Body ────────────────────────────────────────────────── */}
                    <div style={{ padding: "28px 32px 32px" }}>

                        {step === "form" && (
                            <>
                                {/* Questions */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
                                    {config.questions.map((q, idx) => {
                                        const key = `q${idx + 1}` as keyof Ratings;
                                        const rated = ratings[key] > 0;
                                        return (
                                            <div
                                                key={idx}
                                                className="feedback-q-row"
                                                style={{
                                                    padding: "14px 16px",
                                                    borderRadius: 14,
                                                    background: rated ? "linear-gradient(135deg,#f0fdfd,#e8faf9)" : "#fafbfc",
                                                    border: `1.5px solid ${rated ? "#b2eeec" : "#f1f5f9"}`,
                                                    transition: "all 0.25s ease",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "flex-start", flexDirection: "column", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                                        <div style={{ width: 22, height: 22, borderRadius: 7, background: rated ? "linear-gradient(135deg,#12A1A6,#54D6D4)" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "background 0.25s" }}>
                                                            {rated ? (
                                                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                                                </svg>
                                                            ) : (
                                                                <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8" }}>{idx + 1}</span>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: "0.86rem", color: "#1e293b", fontWeight: 600, lineHeight: 1.5 }}>{q}</span>
                                                    </div>
                                                    <StarRating
                                                        value={ratings[key]}
                                                        onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
                                                        disabled={submitting}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Comment box */}
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                                        Anything we could improve? <span style={{ color: "#cbd5e1", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        disabled={submitting}
                                        maxLength={2000}
                                        placeholder="Your feedback helps us build a better product…"
                                        rows={3}
                                        style={{
                                            width: "100%",
                                            borderRadius: 14,
                                            border: "1.5px solid #e2e8f0",
                                            background: "#fafbfc",
                                            padding: "12px 14px",
                                            fontSize: "0.88rem",
                                            color: "#1e293b",
                                            fontFamily: "Raleway, sans-serif",
                                            fontWeight: 500,
                                            resize: "vertical",
                                            transition: "border-color 0.2s, box-shadow 0.2s",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                    {comment.length > 1800 && (
                                        <p style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "right", marginTop: 4 }}>
                                            {2000 - comment.length} characters remaining
                                        </p>
                                    )}
                                </div>

                                {/* Submit button */}
                                <button
                                    type="button"
                                    className="feedback-submit-btn"
                                    onClick={handleSubmit}
                                    disabled={!allRated || submitting}
                                    style={{
                                        width: "100%",
                                        padding: "15px 24px",
                                        borderRadius: 14,
                                        background: !allRated || submitting
                                            ? "linear-gradient(135deg,#94a3b8,#cbd5e1)"
                                            : "linear-gradient(135deg,#0F233F,#1a3a5c)",
                                        color: "#fff",
                                        border: "none",
                                        fontFamily: "Raleway, sans-serif",
                                        fontWeight: 800,
                                        fontSize: "0.95rem",
                                        cursor: !allRated || submitting ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 10,
                                        boxShadow: !allRated || submitting ? "none" : "0 4px 20px rgba(15,35,63,0.28)",
                                        transition: "all 0.2s cubic-bezier(0.34,1.1,0.64,1)",
                                        position: "relative",
                                        overflow: "hidden",
                                        letterSpacing: "0.01em",
                                    }}
                                >
                                    {/* Teal accent stripe */}
                                    {allRated && !submitting && (
                                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg,#54D6D4,#12A1A6)", borderRadius: "14px 0 0 14px" }} />
                                    )}
                                    {submitting ? (
                                        <>
                                            <svg style={{ animation: "spin 0.9s linear infinite" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                                            </svg>
                                            Submitting…
                                        </>
                                    ) : (
                                        <>
                                            {!allRated ? "Rate all 5 questions to submit" : "Submit Feedback"}
                                            {allRated && (
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            )}
                                        </>
                                    )}
                                </button>

                                {!allRated && (
                                    <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, marginTop: 10 }}>
                                        {Object.values(ratings).filter((r) => r > 0).length} of 5 rated
                                    </p>
                                )}
                            </>
                        )}

                        {step === "success" && (
                            <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                                {/* Animated check */}
                                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))", border: "2px solid #b2eeec", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                </div>
                                <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0F233F", marginBottom: 8, letterSpacing: "-0.02em" }}>
                                    Thank you! 🙌
                                </h3>
                                <p style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500, lineHeight: 1.65, maxWidth: 340, margin: "0 auto 28px" }}>
                                    Your feedback helps us make Explain My Letter better for everyone. We really appreciate it.
                                </p>
                                <button
                                    onClick={onClose}
                                    style={{ background: "linear-gradient(135deg,#0F233F,#1a3a5c)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontFamily: "Raleway, sans-serif", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 4px 16px rgba(15,35,63,0.25)" }}
                                >
                                    Close
                                </button>
                            </div>
                        )}

                        {step === "error" && (
                            <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fff1f2", border: "2px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 8v4m0 4h.01" />
                                    </svg>
                                </div>
                                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0F233F", marginBottom: 8 }}>Something went wrong</h3>
                                <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: 24 }}>We couldn't save your feedback. Please try again.</p>
                                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                                    <button
                                        onClick={() => setStep("form")}
                                        style={{ background: "linear-gradient(135deg,#0F233F,#1a3a5c)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "Raleway, sans-serif", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer" }}
                                    >
                                        Try again
                                    </button>
                                    <button
                                        onClick={onClose}
                                        style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "Raleway, sans-serif", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
    );
}

// ─── Trigger Button ───────────────────────────────────────────────────────────

interface FeedbackButtonProps {
    onClick: () => void;
    label?: string;
}

export function FeedbackButton({ onClick, label = "Give Feedback" }: FeedbackButtonProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 12,
                background: hovered ? "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))" : "#f8fafc",
                border: `1.5px solid ${hovered ? "#b2eeec" : "#e2e8f0"}`,
                color: hovered ? "#12A1A6" : "#64748b",
                fontFamily: "Raleway, sans-serif",
                fontWeight: 700,
                fontSize: "0.83rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                transform: hovered ? "translateY(-1px)" : "none",
                boxShadow: hovered ? "0 4px 12px rgba(18,161,166,0.12)" : "none",
            }}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: "transform 0.2s", transform: hovered ? "scale(1.15)" : "scale(1)" }}
            >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            {label}
        </button>
    );
}

// ─── Usage example (for reference — delete in production) ────────────────────
//
// import { useState } from "react";
// import { FeedbackModal, FeedbackButton } from "@/components/home/FeedbackModal";
//
// export function SomeParentPage() {
//     const [feedbackOpen, setFeedbackOpen] = useState(false);
//
//     return (
//         <>
//             <FeedbackButton onClick={() => setFeedbackOpen(true)} />
//             <FeedbackModal
//                 isOpen={feedbackOpen}
//                 onClose={() => setFeedbackOpen(false)}
//                 surveyType="free_summary"          // or "full_breakdown"
//                 jobId={jobId}
//                 accessToken={accessToken}
//             />
//         </>
//     );
// }