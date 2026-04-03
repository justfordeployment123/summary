"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { adminApi } from "@/lib/adminApi";
import type { Category, FeedbackSurvey, FeedbackFilters } from "@/lib/adminApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getFeedback(filters?: FeedbackFilters) {
    const params = new URLSearchParams();
    if (filters?.survey_type) params.set("survey_type", filters.survey_type);
    if (filters?.category_id) params.set("category_id", filters.category_id);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit ?? 25));
    const res = await fetch(`/api/admin/feedback?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch feedback");
    return data as { surveys: FeedbackSurvey[]; pagination: { total: number; page: number; limit: number; pages: number } };
}

function getFeedbackExportUrl(filters?: Omit<FeedbackFilters, "page" | "limit">): string {
    const params = new URLSearchParams({ export: "csv" });
    if (filters?.survey_type) params.set("survey_type", filters.survey_type);
    if (filters?.category_id) params.set("category_id", filters.category_id);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    return `/api/admin/feedback?${params.toString()}`;
}

const URGENCY_CONFIG: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    "Time-Sensitive": { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    Important: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    Routine: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

// ─── SVG Icon set ─────────────────────────────────────────────────────────────

const IC = {
    Chat: ({ cls = "w-full h-full" }: { cls?: string }) => (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    ),
    FileText: ({ cls = "w-full h-full" }: { cls?: string }) => (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    Star: ({ cls = "w-full h-full" }: { cls?: string }) => (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    BarChart: ({ cls = "w-full h-full" }: { cls?: string }) => (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
            <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
    ),
    Download: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
    Filter: () => (
        <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    ),
    X: ({ cls = "w-4 h-4" }: { cls?: string }) => (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    ChevLeft: () => (
        <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    ChevRight: () => (
        <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    Arrow: () => (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    Warn: () => (
        <svg
            className="w-5 h-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    Quote: () => (
        <svg className="w-8 h-8 text-teal-200" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.192 15.757c0-.88-.23-1.618-.69-2.217-.326-.412-.768-.683-1.327-.812-.55-.128-1.07-.137-1.54-.028-.16-.95.1-1.95.78-3 .53-.81 1.24-1.48 2.13-2.01L9.023 7c-1.13.63-2.03 1.41-2.7 2.34-.67.93-1.1 1.9-1.28 2.92-.17 1.01-.13 1.96.13 2.84.26.88.7 1.63 1.32 2.25.62.62 1.37 1.04 2.24 1.26.87.22 1.74.22 2.61 0l-.13-2.84zM19.967 15.757c0-.88-.23-1.618-.69-2.217-.326-.42-.77-.692-1.33-.816-.56-.124-1.08-.13-1.54-.018-.16-.95.1-1.95.78-3 .53-.81 1.24-1.48 2.13-2.01L17.8 7c-1.13.63-2.03 1.41-2.7 2.34-.67.93-1.1 1.9-1.28 2.92-.17 1.01-.13 1.96.13 2.84.26.88.7 1.63 1.32 2.25.62.62 1.37 1.04 2.24 1.26.87.22 1.74.22 2.61 0l-.13-2.84z" />
        </svg>
    ),
};

// ─── Mini star row ────────────────────────────────────────────────────────────

function MiniStars({ value, max = 5 }: { value?: number; max?: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: max }).map((_, i) => (
                <svg
                    key={i}
                    className={`w-2.5 h-2.5 ${i < (value ?? 0) ? "text-amber-400" : "text-slate-200"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

// ─── Rating bar ───────────────────────────────────────────────────────────────

function RatingBar({ value, max = 5 }: { value?: number; max?: number }) {
    const pct = value ? (value / max) * 100 : 0;
    const bar = !value
        ? "bg-slate-200"
        : value >= 4
          ? "bg-gradient-to-r from-emerald-400 to-teal-500"
          : value >= 3
            ? "bg-gradient-to-r from-amber-400 to-orange-400"
            : "bg-gradient-to-r from-red-400 to-rose-500";
    const num = !value ? "text-slate-300" : value >= 4 ? "text-emerald-600" : value >= 3 ? "text-amber-600" : "text-red-500";
    return (
        <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
            </div>
            <span className={`text-xs font-black w-4 text-right tabular-nums ${num}`}>{value ?? "–"}</span>
        </div>
    );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ value }: { value?: number }) {
    const r = 26,
        circ = 2 * Math.PI * r;
    const filled = value ? (value / 5) * circ : 0;
    const stroke = !value ? "#e2e8f0" : value >= 4 ? "#10b981" : value >= 3 ? "#f59e0b" : "#ef4444";
    const track = !value ? "#f8fafc" : value >= 4 ? "#d1fae5" : value >= 3 ? "#fef3c7" : "#fee2e2";
    const tc = !value ? "text-slate-300" : value >= 4 ? "text-emerald-500" : value >= 3 ? "text-amber-500" : "text-red-500";
    return (
        <div className="relative flex items-center justify-center" style={{ width: 68, height: 68, flexShrink: 0 }}>
            <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="34" cy="34" r={r} fill="none" stroke={track} strokeWidth="5" />
                <circle
                    cx="34"
                    cy="34"
                    r={r}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="5"
                    strokeDasharray={`${filled} ${circ}`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center leading-none gap-0.5">
                <span className={`text-base font-black ${tc}`}>{value ? value.toFixed(1) : "–"}</span>
                <span className="text-[9px] text-slate-400 font-bold">/ 5</span>
            </div>
        </div>
    );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon,
    accentCls,
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    accentCls: string;
}) {
    return (
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
            <div className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${accentCls}`} />
            {/* <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-2.5 ${iconCls}`}>{icon}</div> */}
            <div>
                <div className="text-2xl font-black text-slate-900 tabular-nums leading-none">{value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</div>
            </div>
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function CommentModal({ survey, onClose }: { survey: FeedbackSurvey | null; onClose: () => void }) {
    const [mounted, setMounted] = useState(false);
    const open = !!survey;

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
            const t = setTimeout(() => setMounted(true), 10);
            return () => clearTimeout(t);
        } else {
            setMounted(false);
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!survey) return null;

    const isFull = survey.survey_type === "full_breakdown";
    const questions = isFull
        ? ["Clarity of breakdown", "Helpfulness of key points", "Value vs free summary", "Overall satisfaction", "Likelihood to return"]
        : ["Ease of understanding", "Helpfulness overall", "Accuracy", "Urgency rating clarity", "Likelihood to upgrade"];
    const ratings = [
        survey.rating_ease_of_understanding,
        survey.rating_helpfulness,
        survey.rating_accuracy,
        survey.rating_urgency_clarity,
        survey.rating_likelihood_to_upgrade,
    ];
    const urg = URGENCY_CONFIG[survey.urgency_label ?? ""];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ pointerEvents: open ? "auto" : "none" }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)", opacity: mounted ? 1 : 0 }}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className="relative w-full bg-white rounded-3xl flex flex-col overflow-hidden"
                style={{
                    maxWidth: 540,
                    maxHeight: "88vh",
                    boxShadow: "0 40px 100px -12px rgba(15,23,42,0.4), 0 0 0 1px rgba(15,23,42,0.06)",
                    transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
                    opacity: mounted ? 1 : 0,
                    transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                }}
            >
                {/* ── Dark header ── */}
                <div className="relative shrink-0" style={{ background: "linear-gradient(135deg, #0f172a 0%, #134e4a 100%)" }}>
                    {/* Orbs */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-t-3xl">
                        <div
                            className="absolute -top-12 -right-12 w-52 h-52 rounded-full"
                            style={{ background: "radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 65%)" }}
                        />
                        <div
                            className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full"
                            style={{ background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 65%)" }}
                        />
                    </div>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                    >
                        <IC.X />
                    </button>

                    {/* Top content: info + ring side by side */}
                    <div className="relative flex items-start gap-4 px-6 pt-6 pb-0 pr-14">
                        {/* Left: badges + title */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isFull ? "bg-teal-500/15 text-teal-300 border-teal-500/25" : "bg-sky-500/15 text-sky-300 border-sky-500/25"}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFull ? "bg-teal-400" : "bg-sky-400"}`} />
                                    {isFull ? "Full Breakdown" : "Free Summary"}
                                </span>
                                {urg && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-white/10 text-white/80 border-white/15">
                                        <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
                                        {survey.urgency_label}
                                    </span>
                                )}
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${survey.converted_to_paid ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-white/10 text-white/50 border-white/15"}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${survey.converted_to_paid ? "bg-emerald-400" : "bg-white/30"}`} />
                                    {survey.converted_to_paid ? "Paid User" : "Free User"}
                                </span>
                            </div>
                            <h2 className="text-white text-lg font-black tracking-tight">Feedback Detail</h2>
                            {survey.reference_id && <p className="text-slate-400 text-[11px] font-mono mt-1 truncate">{survey.reference_id}</p>}
                            <p className="text-slate-500 text-[11px] mt-0.5">
                                {new Date(survey.created_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
                            </p>
                        </div>

                        {/* Right: score ring — fixed width, won't overflow */}
                        <div className="shrink-0 mt-1">
                            <ScoreRing value={survey.average_rating} />
                        </div>
                    </div>

                    {/* Meta strip */}
                    <div className="relative grid grid-cols-3 mt-5 border-t border-white/[0.08]">
                        {[
                            { label: "Category", value: survey.category_name ?? "–" },
                            { label: "Revenue", value: survey.purchase_amount_pence ? `£${(survey.purchase_amount_pence / 100).toFixed(2)}` : "–" },
                            { label: "Avg Score", value: survey.average_rating ? `${survey.average_rating.toFixed(1)} / 5` : "–" },
                        ].map(({ label, value }, i) => (
                            <div key={label} className={`px-4 py-3 ${i < 2 ? "border-r border-white/[0.08]" : ""}`}>
                                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">{label}</div>
                                <div className="text-white text-sm font-bold truncate">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto">
                    {/* Ratings */}
                    <div className="px-6 pt-5 pb-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-5 h-5 rounded-md bg-teal-500 flex items-center justify-center p-1 text-white">
                                <IC.Star />
                            </div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ratings Breakdown</span>
                        </div>
                        <div className="space-y-4">
                            {questions.map((q, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-slate-600">{q}</span>
                                        <MiniStars value={ratings[i]} />
                                    </div>
                                    <RatingBar value={ratings[i]} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mx-6 h-px bg-slate-100" />

                    {/* Comment */}
                    <div className="px-6 pt-4 pb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center p-1 text-white">
                                <IC.Chat />
                            </div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">User Comment</span>
                        </div>

                        {survey.comment ? (
                            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-teal-50/40 border border-slate-200">
                                <div className="absolute left-0 inset-y-0 w-1 bg-gradient-to-b from-teal-400 to-emerald-500" />
                                <div className="pl-5 pr-4 py-4">
                                    <IC.Quote />
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium mt-1">{survey.comment}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 py-8 flex flex-col items-center gap-2 bg-slate-50/60">
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 p-2">
                                    <IC.Chat />
                                </div>
                                <p className="text-xs text-slate-400 font-semibold">No comment left by user</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                        Submitted {new Date(survey.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold active:scale-95 transition-all"
                    >
                        Close <IC.X cls="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
    const [surveys, setSurveys] = useState<FeedbackSurvey[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 1 });
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<FeedbackSurvey | null>(null);

    const [surveyType, setSurveyType] = useState<"" | "free_summary" | "full_breakdown">("");
    const [categoryId, setCategoryId] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);

    const buildFilters = useCallback(
        (): FeedbackFilters => ({
            ...(surveyType ? { survey_type: surveyType } : {}),
            ...(categoryId ? { category_id: categoryId } : {}),
            ...(fromDate ? { from: fromDate } : {}),
            ...(toDate ? { to: toDate } : {}),
            page,
            limit: 25,
        }),
        [surveyType, categoryId, fromDate, toDate, page],
    );

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const d = await getFeedback(buildFilters());
            setSurveys(d.surveys);
            setPagination(d.pagination);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load feedback");
        } finally {
            setIsLoading(false);
        }
    }, [buildFilters]);

    // Use adminApi.getCategories as specified
    useEffect(() => {
        adminApi
            .getCategories()
            .then((d) => setCategories(d.categories))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const reset = () => {
        setSurveyType("");
        setCategoryId("");
        setFromDate("");
        setToDate("");
        setPage(1);
    };

    const exportUrl = getFeedbackExportUrl({
        ...(surveyType ? { survey_type: surveyType } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate ? { to: toDate } : {}),
    });

    const hasFilters = !!(surveyType || categoryId || fromDate || toDate);
    const avgRating = surveys.length ? (surveys.reduce((a, s) => a + (s.average_rating ?? 0), 0) / surveys.length).toFixed(1) : "–";

    const avgBadge = (v?: number) =>
        !v
            ? "bg-slate-50 text-slate-300"
            : v >= 4
              ? "bg-emerald-50 text-emerald-700"
              : v >= 3
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-600";

    return (
        <div className="flex h-screen bg-[#f8fafc]">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto">
                    <div className="p-8 space-y-6">
                        {/* Header */}
                        <div className="flex items-end justify-between gap-4 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 rounded-md bg-teal-500 flex items-center justify-center p-1 text-white">
                                        <IC.Chat />
                                    </div>
                                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Feedback</span>
                                </div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Feedback Surveys</h1>
                                <p className="text-sm text-slate-500 mt-0.5">User ratings from free summaries and full breakdowns</p>
                            </div>
                            <a
                                href={exportUrl}
                                download
                                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm"
                            >
                                <IC.Download /> Export CSV
                            </a>
                        </div>

                        {/* ── Stats: always 1×4 ── */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: "1.5rem",
                            }}
                        >
                            <StatCard
                                label="Total Responses"
                                value={pagination.total}
                                icon={<IC.Chat />}
                                accentCls="bg-gradient-to-b from-slate-500 to-slate-700"
                                // iconCls="bg-slate-100 text-slate-600"
                            />
                            <StatCard
                                label="Free Summary"
                                value={surveys.filter((s) => s.survey_type === "free_summary").length}
                                icon={<IC.FileText />}
                                accentCls="bg-gradient-to-b from-sky-400 to-blue-500"
                                // iconCls="bg-sky-50 text-sky-600"
                            />
                            <StatCard
                                label="Full Breakdown"
                                value={surveys.filter((s) => s.survey_type === "full_breakdown").length}
                                icon={<IC.Star />}
                                accentCls="bg-gradient-to-b from-teal-400 to-emerald-500"
                                // iconCls="bg-teal-50 text-teal-600"
                            />
                            <StatCard
                                label="Avg Rating"
                                value={avgRating}
                                icon={<IC.BarChart />}
                                accentCls="bg-gradient-to-b from-amber-400 to-orange-500"
                                // iconCls="bg-amber-50 text-amber-600"
                            />
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                                    <IC.Filter />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter</span>
                                </div>

                                <select
                                    value={surveyType}
                                    onChange={(e) => {
                                        setSurveyType(e.target.value as "" | "free_summary" | "full_breakdown");
                                        setPage(1);
                                    }}
                                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 font-semibold text-slate-700"
                                >
                                    <option value="">All Types</option>
                                    <option value="free_summary">Free Summary</option>
                                    <option value="full_breakdown">Full Breakdown</option>
                                </select>

                                <select
                                    value={categoryId}
                                    onChange={(e) => {
                                        setCategoryId(e.target.value);
                                        setPage(1);
                                    }}
                                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 font-semibold text-slate-700"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>

                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => {
                                            setFromDate(e.target.value);
                                            setPage(1);
                                        }}
                                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 text-slate-700"
                                    />
                                    <span className="text-slate-300 text-xs">→</span>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => {
                                            setToDate(e.target.value);
                                            setPage(1);
                                        }}
                                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 text-slate-700"
                                    />
                                </div>

                                {hasFilters && (
                                    <button
                                        onClick={reset}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
                                    >
                                        <IC.X cls="w-3 h-3" /> Clear
                                    </button>
                                )}

                                <span className="ml-auto text-xs text-slate-400 font-medium tabular-nums">
                                    {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm font-medium">
                                <IC.Warn /> {error}
                            </div>
                        )}

                        {/* Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-28 gap-3">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 rounded-full border-[3px] border-slate-100" />
                                        <div className="absolute inset-0 rounded-full border-[3px] border-teal-500 border-t-transparent animate-spin" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-400">Loading feedback…</p>
                                </div>
                            ) : surveys.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-28 gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 p-3.5">
                                        <IC.Chat />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-600 text-sm">No feedback found</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm min-w-[960px]">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/70">
                                                {[
                                                    "Type",
                                                    "Reference",
                                                    "Category",
                                                    "Urgency",
                                                    "Avg",
                                                    "Ratings",
                                                    "Comment",
                                                    "Paid",
                                                    "Revenue",
                                                    "Date",
                                                    "",
                                                ].map((h, i) => (
                                                    <th
                                                        key={i}
                                                        className={`px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap ${h === "" ? "text-right" : ""}`}
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {surveys.map((s) => {
                                                const urg = URGENCY_CONFIG[s.urgency_label ?? ""];
                                                return (
                                                    <tr
                                                        key={s._id}
                                                        className="border-b border-slate-50 last:border-0 hover:bg-teal-50/25 transition-colors duration-100 group cursor-pointer"
                                                        onClick={() => setSelected(s)}
                                                    >
                                                        {/* Type */}
                                                        <td className="px-5 py-3">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${s.survey_type === "full_breakdown" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}
                                                            >
                                                                {s.survey_type === "full_breakdown" ? "Full" : "Free"}
                                                            </span>
                                                        </td>
                                                        {/* Reference */}
                                                        <td className="px-5 py-3 font-mono text-[11px] text-slate-400 max-w-[90px] truncate">
                                                            {s.reference_id ?? <span className="text-slate-200">–</span>}
                                                        </td>
                                                        {/* Category */}
                                                        <td className="px-5 py-3 text-xs font-semibold text-slate-600 max-w-[120px] truncate">
                                                            {s.category_name ?? <span className="text-slate-300 font-normal">–</span>}
                                                        </td>
                                                        {/* Urgency */}
                                                        <td className="px-5 py-3">
                                                            {urg ? (
                                                                <span
                                                                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${urg.bg} ${urg.text} ${urg.border}`}
                                                                >
                                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${urg.dot}`} />
                                                                    {s.urgency_label}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-200 text-xs">–</span>
                                                            )}
                                                        </td>
                                                        {/* Avg */}
                                                        <td className="px-5 py-3">
                                                            <span
                                                                className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-black ${avgBadge(s.average_rating)}`}
                                                            >
                                                                {s.average_rating?.toFixed(1) ?? "–"}
                                                            </span>
                                                        </td>
                                                        {/* Rating pills */}
                                                        <td className="px-5 py-3">
                                                            <div className="flex gap-1">
                                                                {[
                                                                    s.rating_ease_of_understanding,
                                                                    s.rating_helpfulness,
                                                                    s.rating_accuracy,
                                                                    s.rating_urgency_clarity,
                                                                    s.rating_likelihood_to_upgrade,
                                                                ].map((r, i) => (
                                                                    <div
                                                                        key={i}
                                                                        title={`Q${i + 1}: ${r ?? "–"}/5`}
                                                                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${!r ? "bg-slate-100 text-slate-300" : r >= 4 ? "bg-emerald-100 text-emerald-700" : r >= 3 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}
                                                                    >
                                                                        {r ?? "–"}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        {/* Comment */}
                                                        <td className="px-5 py-3 max-w-[140px]">
                                                            {s.comment ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-0.5 h-6 rounded-full bg-teal-400 shrink-0" />
                                                                    <span className="text-[11px] text-slate-500 truncate">{s.comment}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-200 text-xs">–</span>
                                                            )}
                                                        </td>
                                                        {/* Paid */}
                                                        <td className="px-5 py-3">
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${s.converted_to_paid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                                                            >
                                                                {s.converted_to_paid ? "✓ Paid" : "Free"}
                                                            </span>
                                                        </td>
                                                        {/* Revenue */}
                                                        <td className="px-5 py-3 text-xs font-bold text-slate-700 tabular-nums">
                                                            {s.purchase_amount_pence ? (
                                                                `£${(s.purchase_amount_pence / 100).toFixed(2)}`
                                                            ) : (
                                                                <span className="text-slate-200 font-normal">–</span>
                                                            )}
                                                        </td>
                                                        {/* Date */}
                                                        <td className="px-5 py-3 text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                                                            {new Date(s.created_at).toLocaleDateString("en-GB", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "2-digit",
                                                            })}
                                                        </td>
                                                        {/* View */}
                                                        <td className="px-5 py-3 text-right">
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] px-3 py-1.5 rounded-lg border border-teal-200">
                                                                View <IC.Arrow />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400 font-medium">
                                    Showing{" "}
                                    <span className="text-slate-700 font-bold">
                                        {(pagination.page - 1) * pagination.limit + 1}–
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{" "}
                                    of <span className="text-slate-700 font-bold">{pagination.total}</span>
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <IC.ChevLeft /> Prev
                                    </button>
                                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${p === page ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 border border-slate-200 bg-white"}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                        disabled={page === pagination.pages}
                                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next <IC.ChevRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <CommentModal survey={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
