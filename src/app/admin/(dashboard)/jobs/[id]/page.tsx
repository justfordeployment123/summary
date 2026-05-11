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
    regenerationLog: RegenerationEntry[];
    regenerationAttemptsUsed: number;
    regenerationMaxAttempts: number;
    canRegenerate: boolean;
}

interface RegenerationEntry {
    id: string;
    attemptNumber: number;
    triggeredBy: string;
    status: "triggered" | "completed" | "failed";
    createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; dot: string; label: string }> = {
    UPLOADED: { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400", label: "Uploaded" },
    OCR_PROCESSING: { bg: "bg-blue-50 text-blue-700", dot: "bg-blue-500", label: "OCR Processing" },
    OCR_FAILED: { bg: "bg-red-50 text-red-700", dot: "bg-red-500", label: "OCR Failed" },
    FREE_SUMMARY_GENERATING: { bg: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500", label: "Generating Summary" },
    FREE_SUMMARY_COMPLETE: { bg: "bg-teal-50 text-teal-700", dot: "bg-teal-500", label: "Summary Ready" },
    AWAITING_PAYMENT: { bg: "bg-orange-50 text-orange-700", dot: "bg-orange-500", label: "Awaiting Payment" },
    PAYMENT_CONFIRMED: { bg: "bg-blue-50 text-blue-700", dot: "bg-blue-500", label: "Payment Confirmed" },
    PAID_BREAKDOWN_GENERATING: { bg: "bg-purple-50 text-purple-700", dot: "bg-purple-500", label: "Generating Breakdown" },
    COMPLETED: { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
    FAILED: { bg: "bg-red-50 text-red-700", dot: "bg-red-500", label: "Failed" },
    REFUNDED: { bg: "bg-slate-100 text-slate-500", dot: "bg-slate-400", label: "Refunded" },
};

const URGENCY_STYLES: Record<string, string> = {
    Routine: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Important: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    "Time-Sensitive": "bg-red-50 text-red-700 ring-1 ring-red-200",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_BADGE[status] ?? {
        bg: "bg-slate-100 text-slate-500",
        dot: "bg-slate-400",
        label: status,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function Card({ title, accessory, children }: { title: string; accessory?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                {accessory && <div className="flex items-center gap-3">{accessory}</div>}
            </div>
            {children}
        </div>
    );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between py-3.5 border-b border-slate-100 last:border-0 gap-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0 pt-0.5 min-w-36">{label}</span>
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
        if (!confirm("Re-trigger the paid breakdown for this failed job? This will use OpenAI tokens.")) return;
        try {
            await adminApi.regenerateJob(jobId);
            setActionMsg({
                type: "success",
                text: "Regeneration triggered. Refresh in a few seconds to see the updated status.",
            });
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

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // ── Error ──
    if (error || !job) {
        return (
            <div className="p-8 space-y-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Jobs
                </button>
                <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-sm text-red-700">{error || "Job not found."}</div>
            </div>
        );
    }

    const totalTokens = job.tokenLog.reduce((s, t) => s + t.tokensIn + t.tokensOut, 0);
    const totalCost = job.tokenLog.reduce((s, t) => s + t.costEstimate, 0);

    return (
        <div className="p-8 space-y-6">
            {/* ── Back ─────────────────────────────────────────────────────── */}
            <button
                onClick={() => router.push("/admin/jobs")}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors -mt-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Jobs
            </button>

            {/* ── Action message ───────────────────────────────────────────── */}
            {actionMsg && (
                <div
                    className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium border ${
                        actionMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                    }`}
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {actionMsg.type === "success" ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                            />
                        )}
                    </svg>
                    {actionMsg.text}
                    <button
                        onClick={() => setActionMsg(null)}
                        className="ml-auto p-1 rounded-lg hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Page header ──────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap mb-2">
                        <StatusBadge status={job.status} />
                        {job.urgency && (
                            <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    URGENCY_STYLES[job.urgency] ?? "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
                                }`}
                            >
                                {job.urgency}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">{job.userEmail}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {job.userName && <span className="font-medium text-slate-600">{job.userName}</span>}
                        {job.userName && job.category && <span className="mx-2 text-slate-300">·</span>}
                        {job.category && <span>{job.category}</span>}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-1.5">Ref: {job.referenceId}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={loadJob}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Refresh
                    </button>

                    {job.status === "FAILED" && job.canRegenerate && (
                        <button
                            onClick={regenerate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-xl active:scale-95 transition-all shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl active:scale-95 transition-all shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                            Issue Refund
                        </button>
                    )}
                </div>
            </div>

            {/* ── Job + User info ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Job Information">
                    <div className="px-6 py-1">
                        <InfoRow label="Category">{job.category || "—"}</InfoRow>
                        <InfoRow label="Status">
                            <StatusBadge status={job.status} />
                        </InfoRow>
                        <InfoRow label="Previous State">
                            <span className="font-mono text-xs text-slate-500">{job.previousState || "—"}</span>
                        </InfoRow>
                        <InfoRow label="Urgency">
                            {job.urgency ? (
                                <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        URGENCY_STYLES[job.urgency] ?? "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
                                    }`}
                                >
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
                </Card>

                <Card title="User Information">
                    <div className="px-6 py-1">
                        <InfoRow label="Name">{job.userName || "—"}</InfoRow>
                        <InfoRow label="Email">
                            <a href={`mailto:${job.userEmail}`} className="text-teal-600 hover:underline">
                                {job.userEmail}
                            </a>
                        </InfoRow>
                        <InfoRow label="Marketing Consent">
                            {job.marketingConsent ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Yes
                                </span>
                            ) : (
                                <span className="text-slate-400">No</span>
                            )}
                        </InfoRow>
                        <InfoRow label="Disclaimer Ack.">
                            {job.disclaimerAcknowledged ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Acknowledged
                                </span>
                            ) : (
                                <span className="text-slate-400">Not acknowledged</span>
                            )}
                        </InfoRow>
                    </div>
                </Card>
            </div>

            {/* ── Payment ──────────────────────────────────────────────────── */}
            {job.payment && (
                <Card
                    title="Payment"
                    accessory={
                        <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                job.payment.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                    : job.payment.status === "failed"
                                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                        >
                            {job.payment.status.charAt(0).toUpperCase() + job.payment.status.slice(1)}
                        </span>
                    }
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 px-6 py-1">
                        <div className="lg:border-r lg:border-slate-100 lg:pr-8">
                            <InfoRow label="Amount">
                                <span className="text-base font-bold text-slate-900">£{(job.payment.amount / 100).toFixed(2)}</span>
                                <span className="text-xs text-slate-400 ml-1.5">{job.payment.currency.toUpperCase()}</span>
                            </InfoRow>
                            <InfoRow label="Upsells">
                                {job.payment.upsellsPurchased.length > 0 ? (
                                    <span className="text-right">{job.payment.upsellsPurchased.join(", ")}</span>
                                ) : (
                                    <span className="text-slate-400">None</span>
                                )}
                            </InfoRow>
                        </div>
                        <div className="lg:pl-8">
                            <InfoRow label="Stripe Session">
                                <span className="font-mono text-xs text-slate-500 break-all">{job.payment.stripeSessionId || "—"}</span>
                            </InfoRow>
                            <InfoRow label="Stripe Intent">
                                <span className="font-mono text-xs text-slate-500 break-all">{job.payment.stripeIntentId || "—"}</span>
                            </InfoRow>
                        </div>
                    </div>
                </Card>
            )}

            {/* ── Token usage ──────────────────────────────────────────────── */}
            {job.tokenLog.length > 0 && (
                <Card
                    title="Token Usage"
                    accessory={
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                                <span className="font-bold text-slate-700">{totalTokens.toLocaleString()}</span> tokens
                            </span>
                            <span className="w-px h-3 bg-slate-200" />
                            <span>
                                <span className="font-bold text-slate-700">${totalCost.toFixed(4)}</span> est. cost
                            </span>
                        </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-slate-100">
                                <tr>
                                    {["Type", "Model", "Tokens In", "Tokens Out", "Est. Cost", "Attempt", "Time"].map((h) => (
                                        <th key={h} className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {job.tokenLog.map((t, i) => (
                                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5 font-semibold text-slate-700 text-xs">{t.promptType}</td>
                                        <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{t.model}</td>
                                        <td className="px-6 py-3.5 text-slate-600 text-xs">{t.tokensIn.toLocaleString()}</td>
                                        <td className="px-6 py-3.5 text-slate-600 text-xs">{t.tokensOut.toLocaleString()}</td>
                                        <td className="px-6 py-3.5 text-slate-600 text-xs">${t.costEstimate.toFixed(4)}</td>
                                        <td className="px-6 py-3.5 text-slate-500 text-xs">#{t.attemptNumber}</td>
                                        <td className="px-6 py-3.5 text-slate-400 text-xs whitespace-nowrap">
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
                </Card>
            )}

            {/* ── Regeneration history ─────────────────────────────────────── */}
            {job.status === "FAILED" && (
                <Card
                    title="Regeneration Attempts"
                    accessory={
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">
                                {job.regenerationAttemptsUsed} of {job.regenerationMaxAttempts} used
                            </span>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: job.regenerationMaxAttempts }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-5 h-1.5 rounded-full transition-colors ${
                                            i < job.regenerationAttemptsUsed ? "bg-amber-400" : "bg-slate-200"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    }
                >
                    {job.regenerationLog.length === 0 ? (
                        <p className="text-sm text-slate-400 px-6 py-5">
                            No regeneration attempts yet.
                            {job.canRegenerate ? " Click Regenerate above to retry the breakdown." : ""}
                        </p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {job.regenerationLog.map((entry) => (
                                <div key={entry.id} className="flex items-center gap-4 px-6 py-4 text-sm">
                                    <span className="font-mono font-bold text-slate-400 shrink-0 w-6">#{entry.attemptNumber}</span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                                            entry.status === "completed"
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                : entry.status === "failed"
                                                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                        }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                entry.status === "completed"
                                                    ? "bg-emerald-500"
                                                    : entry.status === "failed"
                                                      ? "bg-red-500"
                                                      : "bg-amber-500"
                                            }`}
                                        />
                                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                    </span>
                                    <span className="text-slate-400 text-xs">
                                        by <span className="font-semibold text-slate-600">{entry.triggeredBy}</span>
                                    </span>
                                    <span className="text-slate-300 text-xs ml-auto whitespace-nowrap">
                                        {new Date(entry.createdAt).toLocaleString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {!job.canRegenerate && (
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                            <svg
                                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Maximum attempts reached. Increase <strong className="text-slate-700 mx-0.5">Max Regeneration Attempts</strong> in
                            Settings → Operations to allow more.
                        </div>
                    )}
                </Card>
            )}

            {/* ── State history ────────────────────────────────────────────── */}
            {/* <Card
                title="State History"
                accessory={
                    <span className="text-xs text-slate-400">
                        {job.stateLog.length} transition{job.stateLog.length !== 1 ? "s" : ""}
                    </span>
                }
            >
                {job.stateLog.length === 0 ? (
                    <p className="text-sm text-slate-400 px-6 py-5">No state transitions logged.</p>
                ) : (
                    <div className="px-6 py-5 space-y-0">
                        {job.stateLog.map((entry, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="flex flex-col items-center shrink-0 pt-1">
                                    <div className={`w-2 h-2 rounded-full ring-2 ring-white ${
                                        i === job.stateLog.length - 1 ? "bg-teal-500" : "bg-slate-300"
                                    }`} />
                                    {i < job.stateLog.length - 1 && (
                                        <div className="w-px flex-1 bg-slate-200 my-1 min-h-6" />
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-1 flex-wrap pb-4 min-w-0">
                                    {entry.fromState && (
                                        <>
                                            <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                                {entry.fromState}
                                            </span>
                                            <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </>
                                    )}
                                    <span className="font-mono font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ring-1 ring-teal-100">
                                        {entry.toState}
                                    </span>
                                    <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
                                        via <span className="font-medium text-slate-600">{entry.triggeredBy}</span>
                                    </span>
                                    <span className="text-xs text-slate-300">·</span>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(entry.createdAt).toLocaleString("en-GB", {
                                            day: "numeric", month: "short",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
            */}
        </div>
    );
}
