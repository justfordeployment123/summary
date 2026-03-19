"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { requestUploadUrl, uploadFileToS3, triggerOCR, generateFreeSummary } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type UrgencyLevel = "Routine" | "Important" | "Time-Sensitive";
type PageView = "form" | "summary" | "processing_payment" | "completed";

interface UpsellOption {
    _id: string;
    name: string;
    description: string;
    is_active: boolean;
    category_prices: Record<string, number>; // categoryId → price in pence
}

interface SummaryData {
    summary: string;
    urgency: UrgencyLevel;
    jobId: string;
    accessToken: string;
}

interface CategoryOption {
    _id: string;
    name: string;
    base_price: number; // in pence
}

interface CompletedData {
    detailedBreakdown: string;
    urgency: string;
    referenceId: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<UrgencyLevel, { bg: string; text: string; dot: string; border: string }> = {
    Routine: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
        border: "border-emerald-200",
    },
    Important: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-500",
        border: "border-amber-200",
    },
    "Time-Sensitive": {
        bg: "bg-red-50",
        text: "text-red-700",
        dot: "bg-red-500",
        border: "border-red-200",
    },
};

const PROCESS_STEPS = [
    "Requesting secure upload URL…",
    "Uploading document to secure storage…",
    "Reading and extracting document text…",
    "AI is analysing your letter…",
    "Summary ready.",
];

const STEPS = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Summary" },
    { num: 3, label: "Breakdown" },
];

const MAX_POLLS = 40;
const POLL_INTERVAL = 3000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
    // ── Categories & Upsells ──
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [upsells, setUpsells] = useState<UpsellOption[]>([]);
    const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);

    // ── Form ──
    const [categoryId, setCategoryId] = useState("");
    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // ── Disclaimer ──
    const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);

    // ── Processing ──
    const [isUploading, setIsUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isError, setIsError] = useState(false);

    // ── View & Results ──
    const [view, setView] = useState<PageView>("form");
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [completedData, setCompletedData] = useState<CompletedData | null>(null);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // ── Payment polling ──
    const [pollCount, setPollCount] = useState(0);
    const [pollStatus, setPollStatus] = useState("Verifying payment…");
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Result section ref (scroll-to) ──
    const resultRef = useRef<HTMLDivElement>(null);
    const paymentRef = useRef<HTMLDivElement>(null);

    // ─── Fetch initial data ───────────────────────────────────────────────────

    useEffect(() => {
        async function fetchData() {
            try {
                const [catRes, upsellRes] = await Promise.all([fetch("/api/categories"), fetch("/api/upsells")]);
                const catData = await catRes.json();
                const upsellData = await upsellRes.json();
                if (catData.categories) setCategories(catData.categories);
                if (upsellData.upsells) setUpsells(upsellData.upsells.filter((u: UpsellOption) => u.is_active));
            } catch {
                console.error("Failed to load initial data");
            } finally {
                setIsLoadingCategories(false);
            }
        }
        fetchData();
    }, []);

    // ─── Check for returning payment redirect ─────────────────────────────────

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get("job_id");
        const token = params.get("token");
        const returning = params.get("returning");

        if (jobId && token && returning === "1") {
            // Restore summary state from sessionStorage if available
            const stored = sessionStorage.getItem(`job_${jobId}`);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setSummaryData(parsed);
                    setFirstName(parsed.firstName || "");
                } catch {
                    /* ignore */
                }
            }
            setView("processing_payment");
            startPolling(jobId, token);

            // Clean URL
            window.history.replaceState({}, "", window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Cleanup poll on unmount ──────────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, []);

    // ─── Scroll helpers ───────────────────────────────────────────────────────

    useEffect(() => {
        if (view === "summary" && paymentRef.current) {
            setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }
        if (view === "completed" && resultRef.current) {
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }
    }, [view]);

    // ─── File handling ────────────────────────────────────────────────────────

    const handleFileChange = (selectedFile: File) => {
        if (selectedFile.size > 10 * 1024 * 1024) {
            setUploadStatus("File size must be less than 10 MB.");
            setIsError(true);
            return;
        }
        const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
        if (!allowed.includes(selectedFile.type)) {
            setUploadStatus("Only PDF, DOCX, JPG, and PNG files are accepted.");
            setIsError(true);
            return;
        }
        setFile(selectedFile);
        setUploadStatus("");
        setIsError(false);
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) handleFileChange(dropped);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Upload & Summary ─────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !categoryId || !firstName || !email) {
            setUploadStatus("Please complete all required fields and upload a document.");
            setIsError(true);
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setUploadStatus("Please enter a valid email address.");
            setIsError(true);
            return;
        }
        if (firstName.trim().length < 2) {
            setUploadStatus("Please enter your first name (minimum 2 characters).");
            setIsError(true);
            return;
        }

        setIsUploading(true);
        setIsError(false);
        setCurrentStep(0);

        try {
            setUploadStatus(PROCESS_STEPS[0]);
            const { presignedUrl, s3Key, jobId, accessToken } = await requestUploadUrl({
                fileName: file.name,
                fileType: file.type,
                category: categoryId,
                firstName: firstName.trim(),
                email: email.trim(),
                marketingConsent,
            });

            setCurrentStep(1);
            setUploadStatus(PROCESS_STEPS[1]);
            await uploadFileToS3(presignedUrl, file);

            setCurrentStep(2);
            setUploadStatus(PROCESS_STEPS[2]);
            const ocrResult = await triggerOCR({ jobId, s3Key, fileType: file.type });

            if (ocrResult.confidenceFlag) {
                setUploadStatus("Low confidence detected — results may be slightly inaccurate. You may re-upload a clearer image.");
            }

            setCurrentStep(3);
            setUploadStatus(PROCESS_STEPS[3]);
            const aiResult = await generateFreeSummary({
                jobId,
                extractedText: ocrResult.extractedText,
            });

            setCurrentStep(4);
            setUploadStatus(PROCESS_STEPS[4]);

            const data: SummaryData = {
                summary: aiResult.summary,
                urgency: aiResult.urgency as UrgencyLevel,
                jobId,
                accessToken,
            };
            setSummaryData(data);

            // Persist for returning-from-Stripe flow
            sessionStorage.setItem(`job_${jobId}`, JSON.stringify({ ...data, firstName: firstName.trim() }));

            setView("summary");
        } catch (error: any) {
            setIsError(true);
            setUploadStatus(error.message || "Something went wrong. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    // ─── Upsell toggle ────────────────────────────────────────────────────────

    const toggleUpsell = (id: string) => {
        setSelectedUpsells((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
    };

    // ─── Price calculation ────────────────────────────────────────────────────

    const getBasePrice = (): number => {
        const cat = categories.find((c) => c._id === categoryId);
        return cat?.base_price ?? 499;
    };

    const getUpsellPrice = (upsell: UpsellOption): number => {
        return upsell.category_prices?.[categoryId] ?? 0;
    };

    const getTotalPrice = (): number => {
        const base = getBasePrice();
        const upsellTotal = selectedUpsells.reduce((acc, id) => {
            const u = upsells.find((u) => u._id === id);
            return acc + (u ? getUpsellPrice(u) : 0);
        }, 0);
        return base + upsellTotal;
    };

    // ─── Checkout ─────────────────────────────────────────────────────────────

    const handleCheckout = async () => {
        if (!disclaimerAcknowledged) {
            setUploadStatus("Please acknowledge the disclaimer before proceeding.");
            setIsError(true);
            return;
        }
        if (!summaryData) return;

        setIsCheckingOut(true);
        setIsError(false);
        setUploadStatus("");

        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: summaryData.jobId,
                    accessToken: summaryData.accessToken,
                    upsells: selectedUpsells,
                    disclaimerAcknowledged: true,
                    // Tell Stripe where to return (same page, with flags)
                    successUrl: `${window.location.origin}/?job_id=${summaryData.jobId}&token=${summaryData.accessToken}&returning=1`,
                    cancelUrl: window.location.href,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to start checkout.");
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned.");
            }
        } catch (error: any) {
            setIsCheckingOut(false);
            setIsError(true);
            setUploadStatus(error.message || "Checkout failed. Please try again.");
        }
    };

    // ─── Payment polling ──────────────────────────────────────────────────────

    const startPolling = (jobId: string, token: string) => {
        let count = 0;

        const poll = async () => {
            if (count >= MAX_POLLS) {
                setIsError(true);
                setUploadStatus("This is taking longer than expected. Your payment was successful — please contact support with your reference ID.");
                setView("summary");
                return;
            }

            try {
                const res = await fetch(`/api/jobs/${jobId}/status?token=${token}`);
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error || "Unable to retrieve your results.");
                }
                const data = await res.json();

                if (data.status === "COMPLETED" && data.detailedBreakdown) {
                    setCompletedData({
                        detailedBreakdown: data.detailedBreakdown,
                        urgency: data.urgency ?? "Routine",
                        referenceId: data.referenceId ?? "",
                    });
                    setView("completed");
                    // Clean up stored session
                    sessionStorage.removeItem(`job_${jobId}`);
                    return;
                }

                if (data.status === "FAILED") {
                    setIsError(true);
                    setUploadStatus(
                        "We encountered an issue processing your document. Our team has been notified. Please allow up to 24 hours for manual resolution, or contact support to request a refund.",
                    );
                    setView("summary");
                    return;
                }

                const messages: Record<string, string> = {
                    PAYMENT_CONFIRMED: "Payment confirmed — queuing your detailed breakdown…",
                    PAID_BREAKDOWN_GENERATING: "AI is building your section-by-section breakdown… (~15 seconds)",
                };
                setPollStatus(messages[data.status] ?? "Processing your breakdown…");
            } catch (err: any) {
                setIsError(true);
                setUploadStatus(err.message || "Failed to retrieve your results. Please refresh or contact support.");
                setView("summary");
                return;
            }

            count += 1;
            setPollCount(count);
            pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
        };

        // Initial delay to allow webhook processing
        pollTimerRef.current = setTimeout(poll, 2000);
    };

    // ─── Download ─────────────────────────────────────────────────────────────

    const handleDownload = (format: "pdf" | "docx" | "txt") => {
        if (!summaryData) return;
        window.open(`/api/download/${format}?job_id=${summaryData.jobId}&token=${summaryData.accessToken}`, "_blank");
    };

    // ─── Reset ────────────────────────────────────────────────────────────────

    const handleReset = () => {
        setView("form");
        setFile(null);
        setCategoryId("");
        setFirstName("");
        setEmail("");
        setMarketingConsent(false);
        setUploadStatus("");
        setIsError(false);
        setDisclaimerAcknowledged(false);
        setSummaryData(null);
        setCompletedData(null);
        setSelectedUpsells([]);
        setCurrentStep(0);
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };

    // ─── Derived ──────────────────────────────────────────────────────────────

    const urgencyConfig =
        summaryData?.urgency && URGENCY_CONFIG[summaryData.urgency] ? URGENCY_CONFIG[summaryData.urgency] : URGENCY_CONFIG["Routine"];

    const activeStep = view === "form" ? 0 : view === "summary" || view === "processing_payment" ? 1 : 2;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
            {/* ── Header ── */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
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
                    <span className="text-sm text-slate-500 hidden sm:block">AI-powered letter simplification</span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-10">
                {/* ── Step indicator ── */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {STEPS.map((s, i) => (
                        <div key={s.num} className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    i === activeStep
                                        ? "bg-teal-600 text-white"
                                        : i < activeStep
                                          ? "bg-teal-100 text-teal-700"
                                          : "bg-slate-100 text-slate-400"
                                }`}
                            >
                                {i < activeStep ? (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ) : (
                                    <span>{s.num}</span>
                                )}
                                <span>{s.label}</span>
                            </div>
                            {i < STEPS.length - 1 && <div className="w-6 h-px bg-slate-200" />}
                        </div>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    VIEW: FORM
                ══════════════════════════════════════════════════════════════ */}
                {view === "form" && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
                            <h1 className="text-2xl font-bold text-slate-900">Upload Your Letter</h1>
                            <p className="text-slate-500 mt-1">Get a plain-English summary in under 30 seconds — free.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
                            {/* Category */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Letter Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    required
                                    disabled={isUploading || isLoadingCategories}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-60 transition"
                                >
                                    <option value="" disabled>
                                        {isLoadingCategories ? "Loading categories…" : "Select a category…"}
                                    </option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Name + Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        First Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="e.g. Sarah"
                                        required
                                        minLength={2}
                                        disabled={isUploading}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-60 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        disabled={isUploading}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-60 transition"
                                    />
                                </div>
                            </div>

                            {/* Marketing consent */}
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={marketingConsent}
                                    onChange={(e) => setMarketingConsent(e.target.checked)}
                                    disabled={isUploading}
                                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                                <span className="text-sm text-slate-500">
                                    I agree to receive helpful updates and tips from ExplainMyLetter (optional)
                                </span>
                            </label>

                            {/* Dropzone */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className={`relative mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                                    isDragging
                                        ? "border-teal-500 bg-teal-50"
                                        : file
                                          ? "border-teal-400 bg-teal-50/40"
                                          : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"
                                } ${isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
                            >
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileChange(f);
                                    }}
                                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                                    disabled={isUploading}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-teal-700 text-sm">{file.name}</p>
                                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB — click to change</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                                />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-slate-600 text-sm">Drop your document here, or click to browse</p>
                                        <p className="text-xs text-slate-400">PDF, DOCX, JPG, PNG · Max 10 MB</p>
                                    </div>
                                )}
                            </div>

                            {/* Status banner */}
                            {uploadStatus && (
                                <div
                                    className={`px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 ${
                                        isError ? "bg-red-50 text-red-700 border border-red-200" : "bg-teal-50 text-teal-800 border border-teal-200"
                                    }`}
                                >
                                    {isError ? (
                                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 mt-0.5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                            />
                                        </svg>
                                    )}
                                    <span>{uploadStatus}</span>
                                </div>
                            )}

                            {/* Progress bar */}
                            {isUploading && (
                                <div className="space-y-2">
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-teal-500 rounded-full transition-all duration-700"
                                            style={{ width: `${(currentStep / 4) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 text-right">Step {currentStep + 1} of 4</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm mt-2"
                            >
                                {isUploading ? "Processing…" : "Generate Free Summary →"}
                            </button>

                            <p className="text-center text-xs text-slate-400 pb-2">
                                Your document is encrypted in transit and automatically deleted within 24 hours.
                            </p>
                        </form>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    VIEW: SUMMARY + INLINE PAYMENT
                ══════════════════════════════════════════════════════════════ */}
                {(view === "summary" || view === "processing_payment") && summaryData && (
                    <div className="space-y-5">
                        {/* Free summary card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <h2 className="text-xl font-bold text-slate-900">Your Free Summary</h2>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${urgencyConfig.bg} ${urgencyConfig.text} ${urgencyConfig.border}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${urgencyConfig.dot}`} />
                                        {summaryData.urgency}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Hello {firstName} — here&apos;s what your letter says in plain English.</p>
                            </div>
                            <div className="px-8 py-6">
                                <p className="text-slate-700 leading-relaxed text-[15px]">{summaryData.summary}</p>
                            </div>
                        </div>

                        {/* Disclaimer banner */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    <strong>Important:</strong> This service provides an AI-generated summary for general informational purposes only.
                                    It does not constitute legal, financial, medical, or professional advice. You should always seek advice from a
                                    qualified professional before acting on any document.
                                </p>
                            </div>
                        </div>

                        {/* ── Inline payment card ── */}
                        <div ref={paymentRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Card header */}
                            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <svg
                                            className="w-4.5 h-4.5 text-teal-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            style={{ width: 18, height: 18 }}
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Get Your Full Breakdown</h3>
                                        <p className="text-slate-500 text-sm mt-0.5">
                                            Section-by-section analysis with actions, deadlines & next steps.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 space-y-6">
                                {/* What's included */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">What&apos;s included</p>
                                    <ul className="space-y-2">
                                        {[
                                            "Section-by-section structured breakdown",
                                            "Required actions & key deadlines highlighted",
                                            "Plain-English explanation of legal/technical clauses",
                                            "Downloadable PDF, Word & text formats",
                                        ].map((f) => (
                                            <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                                                <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Upsells */}
                                {upsells.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Optional add-ons</p>
                                        <div className="space-y-2">
                                            {upsells.map((upsell) => {
                                                const price = getUpsellPrice(upsell);
                                                const selected = selectedUpsells.includes(upsell._id);
                                                return (
                                                    <label
                                                        key={upsell._id}
                                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                                            selected
                                                                ? "border-teal-500 bg-teal-50"
                                                                : "border-slate-200 hover:border-slate-300 bg-slate-50"
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleUpsell(upsell._id)}
                                                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-800">{upsell.name}</p>
                                                            {upsell.description && (
                                                                <p className="text-xs text-slate-500 mt-0.5">{upsell.description}</p>
                                                            )}
                                                        </div>
                                                        {price > 0 && (
                                                            <span className="text-sm font-bold text-slate-700 shrink-0">+{formatPrice(price)}</span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Price summary */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-slate-600">
                                            <span>Detailed Breakdown</span>
                                            <span className="font-medium">{formatPrice(getBasePrice())}</span>
                                        </div>
                                        {selectedUpsells.map((id) => {
                                            const u = upsells.find((u) => u._id === id);
                                            if (!u) return null;
                                            const p = getUpsellPrice(u);
                                            return (
                                                <div key={id} className="flex items-center justify-between text-sm text-slate-600">
                                                    <span>{u.name}</span>
                                                    <span className="font-medium">+{formatPrice(p)}</span>
                                                </div>
                                            );
                                        })}
                                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                                            <span>Total</span>
                                            <span>{formatPrice(getTotalPrice())}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Disclaimer checkbox */}
                                <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={disclaimerAcknowledged}
                                        onChange={(e) => setDisclaimerAcknowledged(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-600">
                                        I understand this is an AI-generated summary and not professional advice.
                                    </span>
                                </label>

                                {/* Error */}
                                {uploadStatus && isError && (
                                    <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                                        {uploadStatus}
                                    </div>
                                )}

                                {/* CTA */}
                                <button
                                    onClick={handleCheckout}
                                    disabled={!disclaimerAcknowledged || isCheckingOut}
                                    className="w-full py-4 rounded-xl font-bold text-base bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
                                >
                                    {isCheckingOut ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                />
                                            </svg>
                                            Redirecting to Stripe…
                                        </span>
                                    ) : (
                                        `Pay ${formatPrice(getTotalPrice())} — Get Breakdown →`
                                    )}
                                </button>

                                {/* Trust signals */}
                                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                            />
                                        </svg>
                                        Secured by Stripe
                                    </span>
                                    <span>·</span>
                                    <span>Apple Pay & Google Pay accepted</span>
                                    <span>·</span>
                                    <span>VAT applied where applicable</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Payment processing overlay (replaces payment card once redirected back) ── */}
                        {view === "processing_payment" && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-8 py-12 text-center">
                                    <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-5">
                                        <svg className="w-7 h-7 text-teal-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Preparing Your Breakdown</h3>
                                    <p className="text-sm text-slate-500 animate-pulse">{pollStatus}</p>
                                    <div className="mt-6 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto max-w-xs">
                                        <div className="h-full bg-teal-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                                    </div>
                                    {pollCount > 0 && <p className="text-xs text-slate-400 mt-3">Checking… ({pollCount})</p>}
                                </div>
                            </div>
                        )}

                        {/* Reset link */}
                        {view === "summary" && (
                            <button onClick={handleReset} className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2">
                                ← Upload a different letter
                            </button>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    VIEW: COMPLETED (breakdown revealed on same page)
                ══════════════════════════════════════════════════════════════ */}
                {view === "completed" && summaryData && completedData && (
                    <div className="space-y-5">
                        {/* Free summary (collapsed, still visible) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <h2 className="text-lg font-bold text-slate-900">Free Summary</h2>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${urgencyConfig.bg} ${urgencyConfig.text} ${urgencyConfig.border}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${urgencyConfig.dot}`} />
                                        {summaryData.urgency}
                                    </span>
                                </div>
                            </div>
                            <div className="px-8 py-5">
                                <p className="text-slate-600 leading-relaxed text-sm">{summaryData.summary}</p>
                            </div>
                        </div>

                        {/* Detailed breakdown card */}
                        <div ref={resultRef} className="bg-white rounded-2xl shadow-sm border border-teal-200 overflow-hidden ring-1 ring-teal-100">
                            {/* Success header */}
                            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
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
                                        <h2 className="text-xl font-bold text-slate-900">Your Detailed Breakdown</h2>
                                        {completedData.referenceId && (
                                            <p className="text-xs text-slate-400 font-mono mt-1">Ref: {completedData.referenceId}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Breakdown content */}
                            <div className="px-8 py-7">
                                <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-700">
                                    {completedData.detailedBreakdown}
                                </div>
                            </div>

                            {/* PDF disclaimer footer */}
                            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
                                <p className="text-xs text-slate-400 text-center">
                                    This document is an AI-generated summary for informational purposes only and does not constitute legal, financial,
                                    or professional advice.
                                </p>
                            </div>
                        </div>

                        {/* Download card */}
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

                        {/* Reset */}
                        <div className="text-center">
                            <button onClick={handleReset} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                                ← Upload another letter
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
