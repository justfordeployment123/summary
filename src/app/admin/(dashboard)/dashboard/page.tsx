"use client";

import { useEffect, useState } from "react";
import { adminApi, DashboardStats } from "@/lib/adminApi"; // Import API and Types

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

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    async function fetchStats() {
        try {
            // Use the centralized API client
            const data = await adminApi.getDashboardStats();
            setStats(data);
            setError(""); // Clear previous errors on successful fetch
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function regenerateJob(jobId: string) {
        if (!confirm("Regenerate breakdown for this job?")) return;
        try {
            // Use the centralized API client
            await adminApi.regenerateJob(jobId);
            alert("Regeneration triggered successfully.");
            fetchStats();
        } catch (err: any) {
            alert(`Failed: ${err.message}`);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
            </div>
        );
    }

    if (!stats) return null;

    const capPercent = stats.tokenCapMonth > 0 ? Math.round((stats.tokenUsageMonth / stats.tokenCapMonth) * 100) : 0;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <button onClick={fetchStats} className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Cap warning banner */}
            {stats.capWarning && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <div>
                        <p className="font-semibold text-amber-800 text-sm">Monthly OpenAI usage cap approaching ({capPercent}%)</p>
                        <p className="text-amber-700 text-xs mt-0.5">
                            Paid AI generation will be automatically disabled at 100%. Adjust cap in Settings.
                        </p>
                    </div>
                </div>
            )}

            {/* Stuck jobs alert */}
            {stats.stuckJobs?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                    <p className="font-semibold text-red-800 text-sm mb-3">
                        {stats.stuckJobs.length} job{stats.stuckJobs.length > 1 ? "s" : ""} stuck in processing
                    </p>
                    <div className="space-y-2">
                        {stats.stuckJobs.map((j) => (
                            <div key={j.jobId} className="flex items-center justify-between text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">
                                <span className="font-mono">{j.referenceId}</span>
                                <span>{j.status}</span>
                                <span className="text-red-500">{j.stuckFor}m stuck</span>
                                <span className="text-slate-600">{j.email}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Jobs", value: stats.totalJobs, icon: "📄", color: "text-slate-700" },
                    { label: "Completed Today", value: stats.completedToday, icon: "✅", color: "text-emerald-600" },
                    { label: "Pending", value: stats.pendingJobs, icon: "⏳", color: "text-amber-600" },
                    { label: "Failed", value: stats.failedJobs, icon: "❌", color: "text-red-600" },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="text-2xl mb-1">{s.icon}</div>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Revenue + Token usage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Today</span>
                            <span className="font-bold text-slate-800">£{(stats.revenueToday / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">This month</span>
                            <span className="font-bold text-teal-600 text-lg">£{(stats.revenueMonth / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Monthly OpenAI Usage</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{stats.tokenUsageMonth?.toLocaleString()} tokens used</span>
                            <span className={capPercent >= 80 ? "text-amber-600 font-bold" : ""}>{capPercent}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${capPercent >= 100 ? "bg-red-500" : capPercent >= 80 ? "bg-amber-500" : "bg-teal-500"}`}
                                style={{ width: `${Math.min(capPercent, 100)}%` }}
                            />
                        </div>
                        <div className="text-xs text-slate-400">Cap: {stats.tokenCapMonth?.toLocaleString()} tokens</div>
                    </div>
                </div>
            </div>

            {/* Recent jobs */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">Recent Jobs</h3>
                    <a href="/admin/jobs" className="text-xs text-teal-600 hover:text-teal-700 font-semibold">
                        View all →
                    </a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                {["Reference", "Category", "Email", "Status", "Urgency", "Amount", "Created", "Actions"].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentJobs.map((job) => (
                                <tr key={job.jobId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-600">{job.referenceId}</td>
                                    <td className="px-4 py-3 text-slate-600">{job.category}</td>
                                    <td className="px-4 py-3 text-slate-500">{job.email}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[job.status] ?? "bg-slate-100 text-slate-500"}`}
                                        >
                                            {job.status.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{job.urgency || "—"}</td>
                                    <td className="px-4 py-3 text-slate-600">{job.amount ? `£${(job.amount / 100).toFixed(2)}` : "—"}</td>
                                    <td className="px-4 py-3 text-slate-400">{new Date(job.createdAt).toLocaleDateString("en-GB")}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <a href={`/admin/jobs?id=${job.jobId}`} className="text-teal-600 hover:text-teal-700 font-semibold">
                                                View
                                            </a>
                                            {job.status === "FAILED" && (
                                                <button
                                                    onClick={() => regenerateJob(job.jobId)}
                                                    className="text-amber-600 hover:text-amber-700 font-semibold"
                                                >
                                                    Regenerate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {stats.recentJobs.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                                        No jobs yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
