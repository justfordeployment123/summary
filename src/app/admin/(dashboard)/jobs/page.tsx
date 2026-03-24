"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job {
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
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    "All",
    "UPLOADED",
    "OCR_PROCESSING",
    "OCR_FAILED",
    "FREE_SUMMARY_COMPLETE",
    "AWAITING_PAYMENT",
    "PAYMENT_CONFIRMED",
    "PAID_BREAKDOWN_GENERATING",
    "COMPLETED",
    "FAILED",
    "REFUNDED",
];

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

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_BADGE[status] ?? { bg: "bg-slate-100 text-slate-500", dot: "bg-slate-400", label: status };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminJobsPage() {
    const router = useRouter();

    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchInput, setSearchInput] = useState("");

    const fetchJobs = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "All") params.set("status", statusFilter);
            if (categoryFilter) params.set("category", categoryFilter);
            if (dateFrom) params.set("from", dateFrom);
            if (dateTo) params.set("to", dateTo);
            if (searchEmail) params.set("email", searchEmail);
            const data = (await adminApi.getJobs(params)) as { jobs: Job[] };
            setJobs(data.jobs);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load jobs");
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, categoryFilter, dateFrom, dateTo, searchEmail]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    useEffect(() => {
        const t = setTimeout(() => setSearchEmail(searchInput), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    function clearFilters() {
        setStatusFilter("All");
        setCategoryFilter("");
        setDateFrom("");
        setDateTo("");
        setSearchInput("");
        setSearchEmail("");
    }

    const hasActiveFilters = statusFilter !== "All" || categoryFilter || dateFrom || dateTo || searchEmail;

    // Column layout: email | status | category | urgency | ref | date | arrow
    // Using fixed widths so all cols are balanced
    const COL_CLASSES = "grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_80px_90px_24px]";

    return (
        <div className="p-6 max-w-7xl">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Job Management</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {isLoading ? "Loading…" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} found`}
                    </p>
                </div>
                <button
                    onClick={fetchJobs}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
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
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Email search */}
                    <div className="flex-1 min-w-48">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Search Email</label>
                        <div className="relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="user@example.com"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="min-w-44">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                    {s === "All" ? "All Statuses" : (STATUS_BADGE[s]?.label ?? s)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category */}
                    <div className="min-w-36">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                        <input
                            type="text"
                            placeholder="Legal, Medical…"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        />
                    </div>

                    {/* Date range */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        />
                    </div>

                    {/* Clear */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            ✕ Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    {error}
                </div>
            )}

            {/* ── Table ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className={`${COL_CLASSES} gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200`}>
                    {["User / Email", "Status", "Category", "Urgency", "Ref", "Date", ""].map((h) => (
                        <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {h}
                        </span>
                    ))}
                </div>

                {/* Rows */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading jobs…</span>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <svg className="w-10 h-10 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                        <p className="text-sm font-medium">No jobs found</p>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="mt-2 text-xs text-teal-600 hover:underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {jobs.map((job) => (
                            <button
                                key={job.jobId}
                                onClick={() => router.push(`/admin/jobs/${job.jobId}`)}
                                className={`w-full ${COL_CLASSES} gap-4 px-5 py-3.5 text-left hover:bg-teal-50/40 transition-colors group items-center`}
                            >
                                {/* User / Email */}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-teal-700 transition-colors">
                                        {job.userEmail}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">{job.userName || "—"}</p>
                                </div>

                                {/* Status */}
                                <div className="min-w-0">
                                    <StatusBadge status={job.status} />
                                </div>

                                {/* Category */}
                                <div className="min-w-0">
                                    <span className="text-sm text-slate-600 truncate block">{job.category || "—"}</span>
                                </div>

                                {/* Urgency */}
                                <div className="min-w-0">
                                    {job.urgency ? (
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${URGENCY_BADGE[job.urgency] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}
                                        >
                                            {job.urgency}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-300">—</span>
                                    )}
                                </div>

                                {/* Ref */}
                                <div className="min-w-0">
                                    <span className="text-xs font-mono text-slate-400 truncate block">{job.referenceId}</span>
                                </div>

                                {/* Date */}
                                <div className="min-w-0">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">
                                        {new Date(job.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {new Date(job.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <div className="flex items-center justify-end">
                                    <svg
                                        className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 transition-colors"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {jobs.length > 0 && !isLoading && (
                <p className="text-xs text-slate-400 text-center mt-4">
                    Showing {jobs.length} most recent job{jobs.length !== 1 ? "s" : ""}. Refine filters to narrow results.
                </p>
            )}
        </div>
    );
}
