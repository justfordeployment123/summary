"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, DashboardStats } from "@/lib/adminApi";

// ─── Status badge styles ──────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
    UPLOADED: "bg-slate-100 text-slate-600 ring-slate-200",
    OCR_PROCESSING: "bg-blue-50 text-blue-700 ring-blue-200",
    OCR_FAILED: "bg-red-50 text-red-700 ring-red-200",
    FREE_SUMMARY_GENERATING: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    FREE_SUMMARY_COMPLETE: "bg-teal-50 text-teal-700 ring-teal-200",
    AWAITING_PAYMENT: "bg-orange-50 text-orange-700 ring-orange-200",
    PAYMENT_CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-200",
    PAID_BREAKDOWN_GENERATING: "bg-purple-50 text-purple-700 ring-purple-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    FAILED: "bg-red-50 text-red-700 ring-red-200",
    REFUNDED: "bg-slate-100 text-slate-500 ring-slate-200",
};

function StatIcon({ type }: { type: "jobs" | "completed" | "pending" | "failed" }) {
    const base = "w-4 h-4";
    if (type === "jobs")
        return (
            <svg className={base} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
            </svg>
        );
    if (type === "completed")
        return (
            <svg className={base} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    if (type === "pending")
        return (
            <svg className={base} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    return (
        <svg className={base} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
    );
}

function RefreshButton({ onClick, spinning }: { onClick: () => void; spinning: boolean }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 bg-white border border-slate-200 hover:border-teal-300 px-3 py-1.5 rounded-xl transition-all"
        >
            <svg
                className={`w-3.5 h-3.5 transition-transform ${spinning ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
            </svg>
            Refresh
        </button>
    );
}

export default function AdminDashboard() {
    const router = useRouter();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // Per-job regenerate state: jobId → "idle" | "loading" | "success" | "error" | "limit"
    const [regenState, setRegenState] = useState<Record<string, "idle" | "loading" | "success" | "error" | "limit">>({});
    const [regenMsg, setRegenMsg] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30_000);
        return () => clearInterval(interval);
    }, []);

    async function fetchStats(manual = false) {
        if (manual) setRefreshing(true);
        try {
            const data = await adminApi.getDashboardStats();
            setStats(data);
            setError("");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load stats");
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }

    async function regenerateJob(jobId: string) {
        if (!confirm("Re-trigger the paid breakdown for this failed job? This will use OpenAI tokens.")) return;

        setRegenState((s) => ({ ...s, [jobId]: "loading" }));
        setRegenMsg((s) => ({ ...s, [jobId]: "" }));

        try {
            await adminApi.regenerateJob(jobId);
            setRegenState((s) => ({ ...s, [jobId]: "success" }));
            setRegenMsg((s) => ({ ...s, [jobId]: "Regeneration triggered successfully." }));
            // Refresh stats so the job status updates
            setTimeout(() => fetchStats(), 2000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to regenerate";
            // Detect attempt limit error
            const isLimit = msg.toLowerCase().includes("maximum") || msg.includes("429");
            setRegenState((s) => ({ ...s, [jobId]: isLimit ? "limit" : "error" }));
            setRegenMsg((s) => ({ ...s, [jobId]: msg }));
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-7 h-7 border-[2.5px] border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="flex items-center gap-3 bg-red-50 border border-red-200/80 rounded-2xl p-4 text-sm text-red-700">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                    </svg>
                    {error}
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const capPercent = stats.tokenCapMonth > 0 ? Math.min(Math.round((stats.tokenUsageMonth / stats.tokenCapMonth) * 100), 100) : 0;
    const capBarColor = capPercent >= 100 ? "bg-red-500" : capPercent >= 80 ? "bg-amber-400" : "bg-teal-500";

    return (
        <div className="p-8 space-y-7">
            {/* Page header */}
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-600 mb-1">Overview</p>
                    <h1 className="text-[1.65rem] font-bold text-slate-900 leading-tight tracking-tight">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1.5">Real-time system activity and job processing status.</p>
                </div>
                <RefreshButton onClick={() => fetchStats(true)} spinning={refreshing} />
            </div>

            {/* Alerts */}
            {(stats.capWarning || stats.stuckJobs?.length > 0) && (
                <div className="space-y-3">
                    {stats.capWarning && (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-4">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-amber-900 text-sm">Monthly OpenAI cap at {capPercent}%</p>
                                <p className="text-amber-700 text-xs mt-0.5">
                                    Paid generation will be automatically disabled at 100%. Adjust the cap in Settings.
                                </p>
                            </div>
                        </div>
                    )}
                    {stats.stuckJobs?.length > 0 && (
                        <div className="bg-red-50 border border-red-200/80 rounded-2xl px-5 py-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <p className="font-semibold text-red-800 text-sm">
                                    {stats.stuckJobs.length} job{stats.stuckJobs.length > 1 ? "s" : ""} stuck in processing
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                {stats.stuckJobs.map((j) => (
                                    <div
                                        key={j.jobId}
                                        className="flex items-center gap-4 text-xs bg-white/60 border border-red-100 rounded-xl px-3.5 py-2.5"
                                    >
                                        <span className="font-mono font-semibold text-slate-700 w-28 truncate">{j.referenceId}</span>
                                        <span className="text-slate-500 flex-1">{j.status.replace(/_/g, " ")}</span>
                                        <span className="text-red-600 font-semibold">{j.stuckFor}m</span>
                                        <span className="text-slate-400 truncate max-w-40">{j.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: "Total Jobs",
                        value: stats.totalJobs,
                        type: "jobs" as const,
                        accent: "text-slate-800",
                        bg: "bg-slate-50",
                        icon_color: "text-slate-500",
                    },
                    {
                        label: "Completed Today",
                        value: stats.completedToday,
                        type: "completed" as const,
                        accent: "text-emerald-700",
                        bg: "bg-emerald-50",
                        icon_color: "text-emerald-500",
                    },
                    {
                        label: "Pending",
                        value: stats.pendingJobs,
                        type: "pending" as const,
                        accent: "text-amber-700",
                        bg: "bg-amber-50",
                        icon_color: "text-amber-500",
                    },
                    {
                        label: "Failed",
                        value: stats.failedJobs,
                        type: "failed" as const,
                        accent: "text-red-700",
                        bg: "bg-red-50",
                        icon_color: "text-red-400",
                    },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                        <div className={`w-8 h-8 rounded-xl ${s.bg} ${s.icon_color} flex items-center justify-center mb-3`}>
                            <StatIcon type={s.type} />
                        </div>
                        <p className={`text-2xl font-bold tabular-nums ${s.accent}`}>{s.value.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Revenue + Token usage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Revenue</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Today</p>
                                <p className="text-xl font-bold text-slate-800 mt-0.5 tabular-nums">£{(stats.revenueToday / 100).toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-medium">This month</p>
                                <p className="text-xl font-bold text-teal-600 mt-0.5 tabular-nums">£{(stats.revenueMonth / 100).toFixed(2)}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Revenue figures include all completed and paid jobs.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Monthly OpenAI Usage</h3>
                        <span
                            className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${capPercent >= 100 ? "bg-red-100 text-red-700" : capPercent >= 80 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                        >
                            {capPercent}%
                        </span>
                    </div>
                    <div className="space-y-3">
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${capBarColor}`} style={{ width: `${capPercent}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-slate-600 tabular-nums">{stats.tokenUsageMonth?.toLocaleString()} used</span>
                            <span>Cap: {stats.tokenCapMonth?.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-400">Paid generation disables automatically at 100%.</p>
                    </div>
                </div>
            </div>

            {/* Recent jobs table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">Recent Jobs</h3>
                        {stats.recentJobs.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                                {stats.recentJobs.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => router.push("/admin/jobs")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                    >
                        View all
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {["Reference", "Category", "Email", "Status", "Urgency", "Amount", "Created", "Actions"].map((h, i) => (
                                    <th key={i} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.recentJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-14 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                                <svg
                                                    className="w-6 h-6 text-slate-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={1.5}
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="text-slate-400 font-medium">No jobs yet</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                stats.recentJobs.map((job) => {
                                    const rs = regenState[job.jobId] ?? "idle";
                                    return (
                                        <tr key={job.jobId} className="hover:bg-slate-50/60 transition-colors group">
                                            <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">{job.referenceId}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{job.category}</td>
                                            <td className="px-5 py-3.5 text-slate-400 max-w-40 truncate">{job.email}</td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${STATUS_BADGE[job.status] ?? "bg-slate-100 text-slate-500 ring-slate-200"}`}
                                                >
                                                    {job.status.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500">{job.urgency || "—"}</td>
                                            <td className="px-5 py-3.5 font-semibold text-slate-700 tabular-nums">
                                                {job.amount ? `£${(job.amount / 100).toFixed(2)}` : "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-400 tabular-nums">
                                                {new Date(job.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    {/* View — always visible */}
                                                    <button
                                                        onClick={() => router.push(`/admin/jobs/${job.jobId}`)}
                                                        className="text-teal-600 hover:text-teal-800 font-semibold hover:bg-teal-50 px-2 py-1 rounded-lg transition-all text-xs"
                                                    >
                                                        View
                                                    </button>

                                                    {/* Regenerate — only for FAILED jobs */}
                                                    {job.status === "FAILED" && (
                                                        <div className="flex flex-col items-start gap-0.5">
                                                            <button
                                                                onClick={() => regenerateJob(job.jobId)}
                                                                disabled={rs === "loading" || rs === "success" || rs === "limit"}
                                                                className={`inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-lg transition-all text-xs ${
                                                                    rs === "loading"
                                                                        ? "bg-amber-50 text-amber-400 cursor-wait"
                                                                        : rs === "success"
                                                                          ? "bg-emerald-50 text-emerald-600 cursor-default"
                                                                          : rs === "limit"
                                                                            ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                                                                            : rs === "error"
                                                                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                                                                              : "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                                                }`}
                                                            >
                                                                {rs === "loading" && (
                                                                    <span className="w-2.5 h-2.5 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                                                                )}
                                                                {rs === "success" && (
                                                                    <svg
                                                                        className="w-2.5 h-2.5"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                        strokeWidth={3}
                                                                    >
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                                {rs === "limit" && "At limit"}
                                                                {rs === "error" && "Retry failed"}
                                                                {rs === "idle" && "Retry"}
                                                                {rs === "loading" && "Retrying…"}
                                                                {rs === "success" && "Triggered"}
                                                            </button>
                                                            {/* Inline error/success message */}
                                                            {regenMsg[job.jobId] && rs !== "idle" && rs !== "loading" && (
                                                                <span
                                                                    className={`text-[10px] leading-tight max-w-36 ${rs === "success" ? "text-emerald-600" : "text-red-500"}`}
                                                                >
                                                                    {rs === "success" ? "Generation started" : regenMsg[job.jobId].split(".")[0]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
