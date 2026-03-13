"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type JobStatus = "PAYMENT_CONFIRMED" | "PAID_BREAKDOWN_GENERATING" | "COMPLETED" | "FAILED" | string;

interface JobPollResponse {
    status: JobStatus;
    detailedBreakdown?: string;
    urgency?: string;
    referenceId?: string;
    error?: string;
}

const URGENCY_COLOURS: Record<string, string> = {
    Routine: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Important: "bg-amber-100 text-amber-700 border-amber-200",
    "Time-Sensitive": "bg-red-100 text-red-700 border-red-200",
};

const STATUS_MESSAGES: Record<string, string> = {
    PAYMENT_CONFIRMED: "Payment confirmed — queuing your detailed breakdown…",
    PAID_BREAKDOWN_GENERATING: "AI is building your section-by-section breakdown… (this takes ~15 seconds)",
};

function SuccessContent() {
    const searchParams = useSearchParams();
    const jobId = searchParams.get("job_id");
    const accessToken = searchParams.get("token");

    const [status, setStatus] = useState<JobStatus>("PAYMENT_CONFIRMED");
    const [statusMessage, setStatusMessage] = useState("Verifying secure payment confirmation…");
    const [breakdown, setBreakdown] = useState<string | null>(null);
    const [urgency, setUrgency] = useState<string | null>(null);
    const [referenceId, setReferenceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pollCount, setPollCount] = useState(0);

    const MAX_POLLS = 40; // 40 × 3s = 2 minutes max
    const POLL_INTERVAL = 3000;

    const pollJobStatus = useCallback(async () => {
        if (!jobId || !accessToken) {
            setError("Invalid link — missing job reference. Please contact support if you have been charged.");
            return;
        }

        try {
            const res = await fetch(`/api/jobs/${jobId}/status?token=${accessToken}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Unable to retrieve your results.");
            }

            const data: JobPollResponse = await res.json();
            setStatus(data.status);

            if (data.status === "COMPLETED" && data.detailedBreakdown) {
                setBreakdown(data.detailedBreakdown);
                setUrgency(data.urgency ?? null);
                setReferenceId(data.referenceId ?? null);
                return true; // Stop polling
            }

            if (data.status === "FAILED") {
                setError(
                    "We encountered an issue processing your document. Our team has been notified. Please allow up to 24 hours for manual resolution, or contact support to request a refund.",
                );
                return true; // Stop polling
            }

            setStatusMessage(STATUS_MESSAGES[data.status] ?? "Processing your breakdown…");
            return false;
        } catch (err: any) {
            setError(err.message || "Failed to retrieve your results. Please refresh or contact support.");
            return true;
        }
    }, [jobId, accessToken]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const runPoll = async (count: number) => {
            if (count >= MAX_POLLS) {
                setError(
                    "This is taking longer than expected. Your payment was successful — please contact support with your reference ID and we will manually deliver your breakdown.",
                );
                return;
            }

            const done = await pollJobStatus();
            setPollCount(count + 1);

            if (!done) {
                timer = setTimeout(() => runPoll(count + 1), POLL_INTERVAL);
            }
        };

        // Start with a brief initial delay to allow webhook to process
        timer = setTimeout(() => runPoll(0), 2000);

        return () => clearTimeout(timer);
    }, [pollJobStatus]);

    const handleDownload = async (format: "pdf" | "docx" | "txt") => {
        if (!jobId || !accessToken) return;
        window.open(`/api/download/${format}?job_id=${jobId}&token=${accessToken}`, "_blank");
    };

    // ── Error state ──
    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h2>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">{error}</p>
                    <a
                        href="/"
                        className="inline-block px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
                    >
                        Return to Home
                    </a>
                </div>
            </div>
        );
    }

    // ── Loading / processing state ──
    if (!breakdown) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-teal-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Preparing Your Breakdown</h2>
                    <p className="text-sm text-slate-500 leading-relaxed animate-pulse">{statusMessage}</p>
                    <div className="mt-6 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-3">{pollCount > 0 ? `Checking… (${pollCount})` : "Starting up…"}</p>
                </div>
            </div>
        );
    }

    // ── Success / completed state ──
    const urgencyClass = urgency ? (URGENCY_COLOURS[urgency] ?? URGENCY_COLOURS["Routine"]) : "";

    return (
        <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <span className="font-bold text-slate-800 text-lg tracking-tight">ExplainMyLetter</span>
                    </div>
                    {referenceId && <span className="text-xs text-slate-400 font-mono">Ref: {referenceId}</span>}
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-10 space-y-5">
                {/* Success header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 pt-7 pb-6 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Payment Confirmed</span>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900">Your Detailed Breakdown</h1>
                            </div>
                            {urgency && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${urgencyClass}`}>
                                    {urgency}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Breakdown content */}
                    <div className="px-8 py-7">
                        <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-700">
                            {breakdown}
                        </div>
                    </div>

                    {/* Disclaimer footer */}
                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
                        <p className="text-xs text-slate-400 text-center">
                            This document is an AI-generated summary for informational purposes only and does not constitute legal, financial, or
                            professional advice.
                        </p>
                    </div>
                </div>

                {/* Download buttons */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Download Your Breakdown</h3>
                    <div className="flex flex-wrap gap-3">
                        {(["pdf", "docx", "txt"] as const).map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => handleDownload(fmt)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-sm font-semibold text-slate-600 hover:text-teal-700 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                {fmt.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Download links expire 72 hours after job completion.</p>
                </div>

                {/* Back to home */}
                <div className="text-center">
                    <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                        ← Upload another letter
                    </a>
                </div>
            </main>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Loading your results…</p>
                    </div>
                </div>
            }
        >
            <SuccessContent />
        </Suspense>
    );
}
