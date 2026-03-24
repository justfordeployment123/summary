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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-teal-50 text-teal-700 ring-1 ring-teal-200 rounded-full text-xs font-semibold">
            {label}
            <button
                onClick={onRemove}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-teal-200 transition-colors text-teal-500 hover:text-teal-800"
            >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
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

    // Debounce email search
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

    return (
        <div className="p-8 space-y-6">
            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Job Management</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isLoading ? "Loading jobs…" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} found`}
                    </p>
                </div>
                <button
                    onClick={fetchJobs}
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
            </div>

            {/* ── Filter bar ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Email search */}
                    <div className="flex-1 min-w-52">
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
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="min-w-48">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                    {s === "All" ? "All Statuses" : (STATUS_BADGE[s]?.label ?? s)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category */}
                    <div className="min-w-40">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                        <input
                            type="text"
                            placeholder="Legal, Medical…"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        />
                    </div>

                    {/* Date range */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-shadow"
                        />
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center">Active:</span>
                        {statusFilter !== "All" && (
                            <FilterChip
                                label={`Status: ${STATUS_BADGE[statusFilter]?.label ?? statusFilter}`}
                                onRemove={() => setStatusFilter("All")}
                            />
                        )}
                        {categoryFilter && <FilterChip label={`Category: ${categoryFilter}`} onRemove={() => setCategoryFilter("")} />}
                        {dateFrom && <FilterChip label={`From: ${dateFrom}`} onRemove={() => setDateFrom("")} />}
                        {dateTo && <FilterChip label={`To: ${dateTo}`} onRemove={() => setDateTo("")} />}
                        {searchEmail && (
                            <FilterChip
                                label={`Email: ${searchEmail}`}
                                onRemove={() => {
                                    setSearchInput("");
                                    setSearchEmail("");
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
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

            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User / Email</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Urgency</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-4 w-10" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm">Loading jobs…</span>
                                    </div>
                                </td>
                            </tr>
                        ) : jobs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-600">No jobs found</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {hasActiveFilters
                                                    ? "Try adjusting your filters."
                                                    : "Jobs will appear here once users start uploading."}
                                            </p>
                                        </div>
                                        {hasActiveFilters && (
                                            <button onClick={clearFilters} className="mt-1 text-xs text-teal-600 font-medium hover:underline">
                                                Clear all filters
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job) => (
                                <tr
                                    key={job.jobId}
                                    onClick={() => router.push(`/admin/jobs/${job.jobId}`)}
                                    className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                                >
                                    {/* User / Email */}
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition-colors truncate max-w-[220px]">
                                            {job.userEmail}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{job.userName || "—"}</p>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4">
                                        <StatusBadge status={job.status} />
                                    </td>

                                    {/* Category */}
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600">{job.category || "—"}</span>
                                    </td>

                                    {/* Urgency */}
                                    <td className="px-6 py-4">
                                        {job.urgency ? (
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${URGENCY_STYLES[job.urgency] ?? "bg-slate-50 text-slate-500 ring-1 ring-slate-200"}`}
                                            >
                                                {job.urgency}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </td>

                                    {/* Reference */}
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono text-slate-400">{job.referenceId}</span>
                                    </td>

                                    {/* Date */}
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-600 whitespace-nowrap">
                                            {new Date(job.createdAt).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {new Date(job.createdAt).toLocaleTimeString("en-GB", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </td>

                                    {/* Arrow */}
                                    <td className="px-6 py-4 text-right">
                                        <svg
                                            className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors ml-auto"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Footer count ────────────────────────────────────────────── */}
            {jobs.length > 0 && !isLoading && (
                <p className="text-xs text-slate-400 text-center pb-2">
                    Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                    {hasActiveFilters ? " matching current filters" : ""}. Refine filters to narrow results.
                </p>
            )}
        </div>
    );
}
