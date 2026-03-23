"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StateLogEntry {
    fromState: string;
    toState: string;
    triggeredBy: string;
    createdAt: string;
}

interface TokenLog {
    promptType: string;
    tokensIn: number;
    tokensOut: number;
    costEstimate: number;
    model: string;
    attemptNumber: number;
    createdAt: string;
}

interface JobDetail {
    jobId: string;
    referenceId: string;
    status: string;
    category: string;
    userEmail: string;
    userName: string;
    urgency: string;
    createdAt: string;
    updatedAt: string;
    marketingConsent: boolean;
    disclaimerAcknowledged: boolean;
    previousState: string;
    stripePaymentIntentId?: string;
    payment?: {
        amount: number;
        currency: string;
        status: string;
        stripeSessionId: string;
        stripeIntentId: string;
        upsellsPurchased: string[];
    };
    stateLog: StateLogEntry[];
    tokenLog: TokenLog[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; dot: string; label: string }> = {
    UPLOADED: { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400", label: "Uploaded" },
    OCR_PROCESSING: { bg: "bg-blue-100 text-blue-700", dot: "bg-blue-500", label: "OCR Processing" },
    OCR_FAILED: { bg: "bg-red-100 text-red-700", dot: "bg-red-500", label: "OCR Failed" },
    FREE_SUMMARY_GENERATING: { bg: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500", label: "Generating Summary" },
    FREE_SUMMARY_COMPLETE: { bg: "bg-teal-100 text-teal-700", dot: "bg-teal-500", label: "Summary Ready" },
    AWAITING_PAYMENT: { bg: "bg-orange-100 text-orange-700", dot: "bg-orange-500", label: "Awaiting Payment" },
    PAYMENT_CONFIRMED: { bg: "bg-blue-100 text-blue-700", dot: "bg-blue-500", label: "Payment Confirmed" },
    PAID_BREAKDOWN_GENERATING: { bg: "bg-purple-100 text-purple-700", dot: "bg-purple-500", label: "Generating Breakdown" },
    COMPLETED: { bg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
    FAILED: { bg: "bg-red-100 text-red-700", dot: "bg-red-500", label: "Failed" },
    REFUNDED: { bg: "bg-slate-100 text-slate-500", dot: "bg-slate-400", label: "Refunded" },
};

const URGENCY_BADGE: Record<string, string> = {
    Routine: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Important: "bg-amber-50 text-amber-700 border-amber-200",
    "Time-Sensitive": "bg-red-50 text-red-700 border-red-200",
};

// ── Components ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_BADGE[status] ?? { bg: "bg-slate-100 text-slate-500", dot: "bg-slate-400", label: status };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0 gap-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0 pt-0.5">{label}</span>
            <div className="text-sm text-slate-700 font-medium text-right">{children}</div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params?.id as string;

    const [job, setJob] = useState<JobDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (jobId) loadJob();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);

    async function loadJob() {
        setIsLoading(true);
        setError("");
        try {
            const data = (await adminApi.getJobDetail(jobId)) as JobDetail;
            setJob(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load job");
        } finally {
            setIsLoading(false);
        }
    }

    async function regenerate() {
        if (!confirm("Trigger regeneration for this failed job? This will use OpenAI tokens.")) return;
        try {
            await adminApi.regenerateJob(jobId);
            setActionMsg({ type: "success", text: "Regeneration triggered successfully." });
            loadJob();
        } catch (err: unknown) {
            setActionMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to regenerate" });
        }
    }

    async function refund() {
        if (!confirm("Issue a full refund via Stripe? This cannot be undone.")) return;
        try {
            await adminApi.refundJob(jobId);
            setActionMsg({ type: "success", text: "Refund issued. Job marked as REFUNDED." });
            loadJob();
        } catch (err: unknown) {
            setActionMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to issue refund" });
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-7 h-7 border-[2.5px] border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="p-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Jobs
                </button>
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error || "Job not found."}</div>
            </div>
        );
    }

    const totalTokens = job.tokenLog.reduce((s, t) => s + t.tokensIn + t.tokensOut, 0);
    const totalCost = job.tokenLog.reduce((s, t) => s + t.costEstimate, 0);

    return (
        <div className="p-6 max-w-5xl">
            {/* ── Back ── */}
            <button
                onClick={() => router.push("/admin/jobs")}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Jobs
            </button>

            {/* ── Action message ── */}
            {actionMsg && (
                <div
                    className={`flex items-center gap-2 mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${
                        actionMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                    }`}
                >
                    {actionMsg.text}
                    <button onClick={() => setActionMsg(null)} className="ml-auto opacity-50 hover:opacity-100">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <StatusBadge status={job.status} />
                        {job.urgency && (
                            <span
                                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${URGENCY_BADGE[job.urgency] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}
                            >
                                {job.urgency}
                            </span>
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mt-2">{job.userEmail}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {job.userName} · {job.category}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-1">Ref: {job.referenceId}</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={loadJob}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Refresh
                    </button>
                    {job.status === "FAILED" && (
                        <button
                            onClick={regenerate}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg border border-amber-200 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Regenerate
                        </button>
                    )}
                    {(job.status === "COMPLETED" || job.status === "PAYMENT_CONFIRMED") && (
                        <button
                            onClick={refund}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded-lg border border-red-200 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                            Issue Refund
                        </button>
                    )}
                </div>
            </div>

            {/* ── Two-column grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                {/* Job Info */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Job Information</p>
                    </div>
                    <div className="px-5 py-1">
                        <InfoRow label="Category">{job.category}</InfoRow>
                        <InfoRow label="Status">
                            <StatusBadge status={job.status} />
                        </InfoRow>
                        <InfoRow label="Previous State">
                            <span className="font-mono text-xs">{job.previousState || "—"}</span>
                        </InfoRow>
                        <InfoRow label="Urgency">
                            {job.urgency ? (
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${URGENCY_BADGE[job.urgency] ?? ""}`}>
                                    {job.urgency}
                                </span>
                            ) : (
                                "—"
                            )}
                        </InfoRow>
                        <InfoRow label="Created">
                            {new Date(job.createdAt).toLocaleString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </InfoRow>
                        <InfoRow label="Last Updated">
                            {new Date(job.updatedAt).toLocaleString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </InfoRow>
                    </div>
                </div>

                {/* User Info */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">User Information</p>
                    </div>
                    <div className="px-5 py-1">
                        <InfoRow label="Name">{job.userName}</InfoRow>
                        <InfoRow label="Email">
                            <a href={`mailto:${job.userEmail}`} className="text-teal-600 hover:underline">
                                {job.userEmail}
                            </a>
                        </InfoRow>
                        <InfoRow label="Marketing Consent">
                            {job.marketingConsent ? (
                                <span className="text-emerald-600 font-semibold">✓ Yes</span>
                            ) : (
                                <span className="text-slate-400">No</span>
                            )}
                        </InfoRow>
                        <InfoRow label="Disclaimer Acknowledged">
                            {job.disclaimerAcknowledged ? (
                                <span className="text-emerald-600 font-semibold">✓ Yes</span>
                            ) : (
                                <span className="text-slate-400">No</span>
                            )}
                        </InfoRow>
                    </div>
                </div>
            </div>

            {/* ── Payment ── */}
            {job.payment && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-5">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Payment</p>
                        <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                job.payment.status === "completed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : job.payment.status === "failed"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                            }`}
                        >
                            {job.payment.status}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 px-5 py-1">
                        <div>
                            <InfoRow label="Amount">
                                <span className="text-base font-bold">£{(job.payment.amount / 100).toFixed(2)}</span>
                                <span className="text-xs text-slate-400 ml-1">{job.payment.currency.toUpperCase()}</span>
                            </InfoRow>
                            <InfoRow label="Upsells">
                                {job.payment.upsellsPurchased.length > 0 ? (
                                    job.payment.upsellsPurchased.join(", ")
                                ) : (
                                    <span className="text-slate-400">None</span>
                                )}
                            </InfoRow>
                        </div>
                        <div>
                            <InfoRow label="Stripe Session">
                                <span className="font-mono text-xs break-all">{job.payment.stripeSessionId || "—"}</span>
                            </InfoRow>
                            <InfoRow label="Stripe Intent">
                                <span className="font-mono text-xs break-all">{job.payment.stripeIntentId || "—"}</span>
                            </InfoRow>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Token usage summary ── */}
            {job.tokenLog.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-5">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Token Usage</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                                <span className="font-bold text-slate-700">{totalTokens.toLocaleString()}</span> total tokens
                            </span>
                            <span>
                                <span className="font-bold text-slate-700">${totalCost.toFixed(4)}</span> est. cost
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {["Type", "Model", "Tokens In", "Tokens Out", "Est. Cost", "Attempt", "Time"].map((h) => (
                                        <th key={h} className="text-left px-5 py-3 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {job.tokenLog.map((t, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-semibold text-slate-700">{t.promptType}</td>
                                        <td className="px-5 py-3 text-slate-500 font-mono">{t.model}</td>
                                        <td className="px-5 py-3 text-slate-600">{t.tokensIn.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-slate-600">{t.tokensOut.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-slate-600">${t.costEstimate.toFixed(4)}</td>
                                        <td className="px-5 py-3 text-slate-500">#{t.attemptNumber}</td>
                                        <td className="px-5 py-3 text-slate-400">
                                            {new Date(t.createdAt).toLocaleString("en-GB", {
                                                day: "numeric",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── State history ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">State History</p>
                    <span className="text-xs text-slate-400">
                        {job.stateLog.length} transition{job.stateLog.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {job.stateLog.length === 0 ? (
                    <p className="text-xs text-slate-400 px-5 py-4">No state transitions logged.</p>
                ) : (
                    <div className="px-5 py-4 space-y-2">
                        {job.stateLog.map((entry, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs">
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center shrink-0">
                                    <div className={`w-2 h-2 rounded-full ${i === job.stateLog.length - 1 ? "bg-teal-500" : "bg-slate-300"}`} />
                                    {i < job.stateLog.length - 1 && <div className="w-px h-5 bg-slate-200 mt-1" />}
                                </div>

                                <div className="flex items-center gap-2 flex-1 flex-wrap py-1">
                                    {entry.fromState && (
                                        <>
                                            <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                {entry.fromState}
                                            </span>
                                            <svg
                                                className="w-3 h-3 text-slate-300 shrink-0"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </>
                                    )}
                                    <span className="font-mono font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[10px]">
                                        {entry.toState}
                                    </span>
                                    <span className="text-slate-400 ml-auto">via {entry.triggeredBy}</span>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-slate-400">
                                        {new Date(entry.createdAt).toLocaleString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
