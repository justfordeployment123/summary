"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
    payment?: {
        amount: number;
        currency: string;
        status: string;
        stripeSessionId: string;
        upsellsPurchased: string[];
    };
}

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

interface JobDetail extends Job {
    stateLog: StateLogEntry[];
    tokenLog: TokenLog[];
}

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

const STATUS_BADGE: Record<string, string> = {
    UPLOADED: "bg-slate-100 text-slate-600",
    OCR_PROCESSING: "bg-blue-100 text-blue-700",
    OCR_FAILED: "bg-red-100 text-red-700",
    FREE_SUMMARY_GENERATING: "bg-yellow-100 text-yellow-700",
    FREE_SUMMARY_COMPLETE: "bg-teal-100 text-teal-700",
    AWAITING_PAYMENT: "bg-orange-100 text-orange-700",
    PAYMENT_CONFIRMED: "bg-blue-100 text-blue-700",
    PAID_BREAKDOWN_GENERATING: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-red-100 text-red-700",
    REFUNDED: "bg-slate-100 text-slate-500",
};

export default function AdminJobsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const preselectedId = searchParams.get("id");

    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [error, setError] = useState("");

    // Filters
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [searchEmail, setSearchEmail] = useState("");

    const fetchJobs = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "All") params.set("status", statusFilter);
            if (categoryFilter) params.set("category", categoryFilter);
            if (dateFrom) params.set("from", dateFrom);
            if (dateTo) params.set("to", dateTo);
            if (searchEmail) params.set("email", searchEmail);

            const res = await fetch(`/api/admin/jobs?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load jobs");
            const data = await res.json();
            setJobs(data.jobs);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, categoryFilter, dateFrom, dateTo, searchEmail]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    useEffect(() => {
        if (preselectedId) loadJobDetail(preselectedId);
    }, [preselectedId]);

    async function loadJobDetail(jobId: string) {
        setIsLoadingDetail(true);
        try {
            const res = await fetch(`/api/admin/jobs/${jobId}`);
            if (!res.ok) throw new Error("Failed to load job detail");
            const data = await res.json();
            setSelectedJob(data);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsLoadingDetail(false);
        }
    }

    async function regenerateJob(jobId: string) {
        if (!confirm("Trigger regeneration for this failed job? This will use OpenAI tokens.")) return;
        try {
            const res = await fetch(`/api/admin/jobs/${jobId}/regenerate`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert("Regeneration triggered.");
            fetchJobs();
            if (selectedJob?.jobId === jobId) loadJobDetail(jobId);
        } catch (err: any) {
            alert(`Failed: ${err.message}`);
        }
    }

    async function refundJob(jobId: string) {
        if (!confirm("Issue a full refund for this job via Stripe? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/admin/jobs/${jobId}/refund`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert("Refund issued. Job marked as REFUNDED.");
            fetchJobs();
            if (selectedJob?.jobId === jobId) loadJobDetail(jobId);
        } catch (err: any) {
            alert(`Failed: ${err.message}`);
        }
    }

    return (
        <div className="flex h-full" style={{ minHeight: "calc(100vh - 64px)" }}>
            {/* Left panel: job list */}
            <div className="w-full lg:w-1/2 xl:w-2/5 border-r border-slate-200 flex flex-col">
                {/* Filters */}
                <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
                    <h2 className="text-sm font-bold text-slate-700">Job Management</h2>

                    <input
                        type="text"
                        placeholder="Search by email…"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Category filter…"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                        />
                    </div>
                </div>

                {/* Job list */}
                <div className="overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-sm">No jobs found</div>
                    ) : (
                        jobs.map((job) => (
                            <button
                                key={job.jobId}
                                onClick={() => loadJobDetail(job.jobId)}
                                className={`w-full text-left px-4 py-4 border-b border-slate-100 hover:bg-teal-50 transition-colors ${
                                    selectedJob?.jobId === job.jobId ? "bg-teal-50 border-l-2 border-l-teal-500" : ""
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-mono text-slate-500">{job.referenceId}</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[job.status] ?? "bg-slate-100 text-slate-500"}`}
                                    >
                                        {job.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-slate-700">{job.userEmail}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                    {job.category} · {new Date(job.createdAt).toLocaleDateString("en-GB")}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right panel: job detail */}
            <div className="flex-1 overflow-y-auto">
                {isLoadingDetail ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : selectedJob ? (
                    <div className="p-6 space-y-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{selectedJob.userEmail}</h2>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">Ref: {selectedJob.referenceId}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {selectedJob.status === "FAILED" && (
                                    <button
                                        onClick={() => regenerateJob(selectedJob.jobId)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-200"
                                    >
                                        🔄 Regenerate
                                    </button>
                                )}
                                {(selectedJob.status === "COMPLETED" || selectedJob.status === "PAYMENT_CONFIRMED") && (
                                    <button
                                        onClick={() => refundJob(selectedJob.jobId)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-200"
                                    >
                                        ↩ Refund
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Job info */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-2 gap-3 text-xs">
                            {[
                                [
                                    "Status",
                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[selectedJob.status] ?? ""}`}>
                                        {selectedJob.status.replace(/_/g, " ")}
                                    </span>,
                                ],
                                ["Category", selectedJob.category],
                                ["Name", selectedJob.userName],
                                ["Urgency", selectedJob.urgency || "—"],
                                ["Marketing Consent", selectedJob.marketingConsent ? "✅ Yes" : "No"],
                                ["Disclaimer Ack.", selectedJob.disclaimerAcknowledged ? "✅ Yes" : "No"],
                                ["Created", new Date(selectedJob.createdAt).toLocaleString("en-GB")],
                                ["Updated", new Date(selectedJob.updatedAt).toLocaleString("en-GB")],
                            ].map(([label, value]) => (
                                <div key={String(label)}>
                                    <div className="text-slate-400 mb-0.5">{label}</div>
                                    <div className="font-semibold text-slate-700">{value as any}</div>
                                </div>
                            ))}
                        </div>

                        {/* Payment */}
                        {selectedJob.payment && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Payment</h3>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-2 gap-3 text-xs">
                                    {[
                                        ["Amount", `£${(selectedJob.payment.amount / 100).toFixed(2)} ${selectedJob.payment.currency.toUpperCase()}`],
                                        ["Status", selectedJob.payment.status],
                                        ["Stripe Session", selectedJob.payment.stripeSessionId],
                                        ["Upsells", selectedJob.payment.upsellsPurchased.join(", ") || "None"],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <div className="text-slate-400 mb-0.5">{label}</div>
                                            <div className="font-semibold text-slate-700 break-all">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* State log */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">State History</h3>
                            <div className="space-y-1">
                                {selectedJob.stateLog.map((entry, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                                    >
                                        <span className="text-slate-400 shrink-0">{new Date(entry.createdAt).toLocaleString("en-GB")}</span>
                                        <span className="font-mono text-slate-500">{entry.fromState || "—"}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className="font-mono font-semibold text-teal-700">{entry.toState}</span>
                                        <span className="text-slate-400 ml-auto">via {entry.triggeredBy}</span>
                                    </div>
                                ))}
                                {selectedJob.stateLog.length === 0 && (
                                    <p className="text-xs text-slate-400 px-3 py-2">No state transitions logged.</p>
                                )}
                            </div>
                        </div>

                        {/* Token log */}
                        {selectedJob.tokenLog.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Token Usage</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border border-slate-200 rounded-lg">
                                                {["Type", "Model", "Tokens In", "Tokens Out", "Est. Cost", "Attempt", "Time"].map((h) => (
                                                    <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedJob.tokenLog.map((t, i) => (
                                                <tr key={i} className="border-b border-slate-100">
                                                    <td className="px-3 py-2 font-semibold text-slate-600">{t.promptType}</td>
                                                    <td className="px-3 py-2 text-slate-500 font-mono">{t.model}</td>
                                                    <td className="px-3 py-2 text-slate-600">{t.tokensIn.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-slate-600">{t.tokensOut.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-slate-600">${t.costEstimate.toFixed(4)}</td>
                                                    <td className="px-3 py-2 text-slate-500">#{t.attemptNumber}</td>
                                                    <td className="px-3 py-2 text-slate-400">{new Date(t.createdAt).toLocaleString("en-GB")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        <div className="text-center">
                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            Select a job to view details
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
