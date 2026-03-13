"use client";

import { useState, useCallback, useEffect } from "react";
import { requestUploadUrl, uploadFileToS3, triggerOCR, generateFreeSummary } from "@/lib/api";

type UrgencyLevel = "Routine" | "Important" | "Time-Sensitive";

const URGENCY_CONFIG: Record<UrgencyLevel, { bg: string; text: string; dot: string; label: string }> = {
    Routine: {
        bg: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
        label: "Routine",
    },
    Important: {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        dot: "bg-amber-500",
        label: "Important",
    },
    "Time-Sensitive": {
        bg: "bg-red-50 border-red-200",
        text: "text-red-700",
        dot: "bg-red-500",
        label: "Time-Sensitive",
    },
};

type Step = "form" | "summary";

interface SummaryData {
    summary: string;
    urgency: UrgencyLevel;
    jobId: string;
}

interface CategoryOption {
    _id: string;
    name: string;
}

const STEPS = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Summary" },
    { num: 3, label: "Breakdown" },
];

export default function Home() {
    // Dynamic Categories State
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    // Form state
    const [categoryId, setCategoryId] = useState("");
    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Disclaimer & checkout
    const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);

    // Processing state
    const [isUploading, setIsUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isError, setIsError] = useState(false);

    // Results
    const [view, setView] = useState<Step>("form");
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const PROCESS_STEPS = [
        "Requesting secure upload URL…",
        "Uploading document to secure storage…",
        "Reading and extracting document text…",
        "AI is analysing your letter…",
        "Complete! Your summary is ready.",
    ];

    // Fetch categories on mount
    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch("/api/categories");
                const data = await res.json();
                if (data.categories) {
                    setCategories(data.categories);
                }
            } catch (error) {
                console.error("Failed to load categories");
            } finally {
                setIsLoadingCategories(false);
            }
        }
        fetchCategories();
    }, []);

    const handleFileChange = (selectedFile: File) => {
        if (selectedFile.size > 10 * 1024 * 1024) {
            setUploadStatus("File size must be less than 10MB.");
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
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !categoryId || !firstName || !email) {
            setUploadStatus("Please complete all required fields and upload a document.");
            setIsError(true);
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
            const { presignedUrl, s3Key, jobId } = await requestUploadUrl({
                fileName: file.name,
                fileType: file.type,
                category: categoryId, // Pass the database ID, not the string name
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
            const aiResult = await generateFreeSummary({ jobId, extractedText: ocrResult.extractedText });

            setCurrentStep(4);
            setUploadStatus(PROCESS_STEPS[4]);
            setSummaryData({ summary: aiResult.summary, urgency: aiResult.urgency as UrgencyLevel, jobId });
            setView("summary");
        } catch (error: any) {
            setIsError(true);
            setUploadStatus(error.message || "Something went wrong. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

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
                    upsells: [],
                    disclaimerAcknowledged: true,
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

    const urgencyConfig = summaryData ? (URGENCY_CONFIG[summaryData.urgency] ?? URGENCY_CONFIG["Routine"]) : null;

    return (
        <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
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
                    <span className="text-sm text-slate-500 hidden sm:block">AI-powered letter simplification</span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-10">
                <div className="flex items-center justify-center gap-2 mb-10">
                    {STEPS.map((s, i) => (
                        <div key={s.num} className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    (view === "form" && i === 0) || (view === "summary" && i === 1)
                                        ? "bg-teal-600 text-white"
                                        : view === "summary" && i === 0
                                          ? "bg-teal-100 text-teal-700"
                                          : "bg-slate-100 text-slate-400"
                                }`}
                            >
                                {view === "summary" && i === 0 ? (
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

                {view === "form" && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
                            <h1 className="text-2xl font-bold text-slate-900">Upload Your Letter</h1>
                            <p className="text-slate-500 mt-1">Get a plain-English summary in under 30 seconds — free.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
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
                                        {isLoadingCategories ? "Loading categories..." : "Select a category…"}
                                    </option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

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
                                        <p className="text-xs text-slate-400">PDF, DOCX, JPG, PNG · Max 10MB</p>
                                    </div>
                                )}
                            </div>

                            {uploadStatus && (
                                <div
                                    className={`px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 ${isError ? "bg-red-50 text-red-700 border border-red-200" : "bg-teal-50 text-teal-800 border border-teal-200"}`}
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

                {view === "summary" && summaryData && urgencyConfig && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-8 pt-7 pb-6 border-b border-slate-100">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <h2 className="text-xl font-bold text-slate-900">Your Free Summary</h2>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${urgencyConfig.bg} ${urgencyConfig.text}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${urgencyConfig.dot}`} />
                                        {urgencyConfig.label}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Hello {firstName} — here's what your letter says in plain English.</p>
                            </div>
                            <div className="px-8 py-6">
                                <p className="text-slate-700 leading-relaxed text-[15px]">{summaryData.summary}</p>
                            </div>
                        </div>

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

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-8 pt-7 pb-3 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900">Need to know exactly what to do next?</h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    Get a full section-by-section breakdown with required actions, key deadlines, and next steps.
                                </p>
                            </div>

                            <div className="px-8 py-5">
                                <ul className="space-y-2 mb-6">
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

                                <label className="flex items-start gap-3 mb-5 cursor-pointer select-none p-3 rounded-lg bg-slate-50 border border-slate-200">
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

                                {uploadStatus && isError && (
                                    <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                                        {uploadStatus}
                                    </div>
                                )}

                                <button
                                    onClick={handleCheckout}
                                    disabled={!disclaimerAcknowledged || isCheckingOut}
                                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
                                >
                                    {isCheckingOut ? "Redirecting to Stripe…" : "Get Detailed Breakdown — £4.99"}
                                </button>

                                <p className="text-center text-xs text-slate-400 mt-3">Secured by Stripe · Apple Pay & Google Pay accepted</p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
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
                            }}
                            className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
                        >
                            ← Upload a different letter
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
