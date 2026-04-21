"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GlobalStyles, HeroSection, UploadSection, SummaryView, CompletedView } from "@/components/home";
import { PROCESS_STEPS, MAX_POLLS, POLL_INTERVAL } from "@/lib/homeUtils";
import type { Category, Upsell, SummaryData, CompletedData, ViewState, UrgencyLevel } from "@/types/home";
import { useRouter } from "next/navigation";

// ─── Safe JSON helper ─────────────────────────────────────────────────────────
// Detects Cloudflare HTML error pages before attempting JSON.parse,
// and surfaces human-readable messages for 429 / 403 / token errors.
async function safeJson<T>(res: Response): Promise<T> {
    const text = await res.text();

    // Cloudflare or reverse-proxy returned an HTML error page instead of JSON
    if (text.trimStart().startsWith("<")) {
        if (res.status === 429) throw new Error("TOO_MANY_REQUESTS");
        if (res.status === 403) throw new Error("ACCESS_DENIED");
        throw new Error(`SERVER_ERROR_${res.status}`);
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error("INVALID_RESPONSE");
    }
}

// ─── Human-readable error messages ────────────────────────────────────────────
function friendlyError(code: string): string {
    if (code === "TOO_MANY_REQUESTS") return "Too many requests from this email — please wait a moment and try again.";
    if (code === "ACCESS_DENIED") return "Access blocked. Please refresh the page and try again.";
    if (code.startsWith("SERVER_ERROR_")) return `Unexpected server response (${code.replace("SERVER_ERROR_", "")}). Please refresh and try again.`;
    if (code === "INVALID_RESPONSE") return "Invalid response from server. Please try again.";
    return code;
}

export default function Home() {
    // ── Data ──────────────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [upsells, setUpsells] = useState<Upsell[]>([]);

    // ── Form state ────────────────────────────────────────────────────────────
    const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
    const [categoryId, setCategoryId] = useState("");
    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);

    // ── Upload state ──────────────────────────────────────────────────────────
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isError, setIsError] = useState(false);

    // ── Category mismatch state ───────────────────────────────────────────────
    // AFTER
    const [categoryMismatch, setCategoryMismatch] = useState<{
        topCategories: { name: string; confidence: number }[];
    } | null>(null);

    // ── View / result state ───────────────────────────────────────────────────
    const [view, setView] = useState<ViewState>("form");
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [completedData, setCompletedData] = useState<CompletedData | null>(null);

    // ── Stripe embedded payment state ─────────────────────────────────────────
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

    // ── Polling state ─────────────────────────────────────────────────────────
    const [pollCount, setPollCount] = useState(0);
    const [pollStatus, setPollStatus] = useState("Verifying payment…");
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const formRef = useRef<HTMLElement | null>(null);
    const paymentRef = useRef<HTMLDivElement | null>(null);
    // Add with your other refs:

    const turnstileResetRef = useRef<(() => void) | null>(null);

    const router = useRouter();
    // ── Initial data fetch ────────────────────────────────────────────────────
    useEffect(() => {
        async function fetchData() {
            try {
                const [catRes, upsellRes] = await Promise.all([fetch("/api/categories"), fetch("/api/upsells")]);
                const catData = await catRes.json();
                const upsellData = await upsellRes.json();
                if (catData.categories) setCategories(catData.categories);
                if (upsellData.upsells) setUpsells((upsellData.upsells as Upsell[]).filter((u) => u.is_active));
            } catch {
                // silently fail
            } finally {
                setIsLoadingCategories(false);
            }
        }
        fetchData();
    }, []);

    // ── Handle returning Stripe redirect (3D Secure / bank redirect) ──────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get("job_id");
        const token = params.get("token");
        const returning = params.get("returning");

        if (jobId && token && returning === "1") {
            const stored = sessionStorage.getItem(`job_${jobId}`);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as SummaryData & { firstName?: string };
                    setSummaryData(parsed);
                    if (parsed.firstName) setFirstName(parsed.firstName);
                } catch {
                    // ignore parse errors
                }
            }
            setView("processing_payment");
            startPolling(jobId, token);
            window.history.replaceState({}, "", window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handler = () => {
            handleRetryWithData();
            router.push("/#upload");
        };
        window.addEventListener("navbar:reset", handler);
        return () => window.removeEventListener("navbar:reset", handler);
    }, []);
    // ── Scroll on view change ─────────────────────────────────────────────────
    useEffect(() => {
        if (view === "summary" && paymentRef.current) {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
    }, [view]);

    // ── Cleanup polling on unmount ────────────────────────────────────────────
    useEffect(
        () => () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        },
        [],
    );

    // ── Session expired helper — shows message then auto-resets ──────────────
    const handleSessionExpired = useCallback(
        (customMessage?: string) => {
            setIsError(true);
            setUploadStatus(customMessage ?? "Your session has expired. Please re-upload your document to continue.");
            setTimeout(() => {
                handleReset();
            }, 3500);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    // ── File drop ─────────────────────────────────────────────────────────────
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (!dropped) return;
        const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
        if (dropped.size > 10 * 1024 * 1024) {
            setUploadStatus("File must be under 10 MB.");
            setIsError(true);
            return;
        }
        if (!allowed.includes(dropped.type)) {
            setUploadStatus("Only PDF, DOCX, JPG, PNG accepted.");
            setIsError(true);
            return;
        }
        setFile(dropped);
        setUploadStatus("");
        setIsError(false);
    }, []);

    // ── Upload & Summary ──────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file || !categoryId || !firstName || !email) {
            setUploadStatus("Please complete all fields and upload a document.");
            setIsError(true);
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setUploadStatus("Please enter a valid email address.");
            setIsError(true);
            return;
        }

        setIsUploading(true);
        setIsError(false);
        setCurrentStep(0);
        setCategoryMismatch(null);

        try {
            const { requestUploadUrl, uploadFileToS3, triggerOCR, generateFreeSummary } = await import("@/lib/api");

            setUploadStatus(PROCESS_STEPS[0]);
            const { presignedUrl, s3Key, jobId, accessToken } = await requestUploadUrl({
                fileName: file.name,
                fileType: file.type,
                category: categoryId,
                firstName: firstName.trim(),
                email: email.trim(),
                marketingConsent,
                turnstileToken: turnstileToken!,
            });

            setCurrentStep(1);
            setUploadStatus(PROCESS_STEPS[1]);

            // uploadFileToS3 now has built-in timeout (8s) + retry (3×) logic
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
            console.log("[handleSubmit] AI result received", aiResult);
            setCurrentStep(4);
            setUploadStatus(PROCESS_STEPS[4]);

            // ── Category mismatch: show mismatch screen, no payment ──
            // AFTER
            if (aiResult.categoryCorrect === false) {
                setCategoryMismatch({ topCategories: aiResult.topCategories ?? [] });
                setView("category_mismatch");
                return;
            }

            // ── Category correct: show normal summary + payment ──
            const data: SummaryData = {
                summary: aiResult.summary,
                urgency: aiResult.urgency as UrgencyLevel,
                jobId,
                accessToken,
            };
            setSummaryData(data);
            sessionStorage.setItem(`job_${jobId}`, JSON.stringify({ ...data, firstName: firstName.trim() }));
            setView("summary");
        } catch (err) {
            setIsError(true);
            const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
            setUploadStatus(friendlyError(msg));
            turnstileResetRef.current?.(); // ← add this line
        } finally {
            setIsUploading(false);
        }
    };

    // ── Price helpers ─────────────────────────────────────────────────────────
    const getBasePrice = () => categories.find((c) => c._id === categoryId)?.base_price ?? 499;
    const getUpsellPrice = (u: Upsell) => u.category_prices?.[categoryId] ?? 0;
    const getTotalPrice = () => {
        const base = getBasePrice();
        const upsellTotal = selectedUpsells.reduce((acc, id) => {
            const u = upsells.find((u) => u._id === id);
            return acc + (u ? getUpsellPrice(u) : 0);
        }, 0);
        return base + upsellTotal;
    };

    // ── Create Payment Intent → show embedded Stripe form ────────────────────
    const handleProceedToPayment = async () => {
        if (!disclaimerAcknowledged) {
            setUploadStatus("Please acknowledge the disclaimer before proceeding.");
            setIsError(true);
            return;
        }
        if (!summaryData) return;

        setIsCreatingPaymentIntent(true);
        setIsError(false);
        setUploadStatus("");

        try {
            const res = await fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: summaryData.jobId,
                    accessToken: summaryData.accessToken,
                    upsells: selectedUpsells,
                    disclaimerAcknowledged: true,
                }),
            });

            // ── Detect Cloudflare HTML / token errors before parsing ──
            if (res.status === 401 || res.status === 403) {
                handleSessionExpired();
                return;
            }

            const data = await safeJson<{ clientSecret?: string; error?: string }>(res);

            if (!res.ok) {
                const msg = data.error ?? "Failed to initialise payment.";
                // Token invalid / expired on the backend
                if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("unauthorized")) {
                    handleSessionExpired();
                    return;
                }
                throw new Error(msg);
            }

            if (!data.clientSecret) throw new Error("No client secret returned.");

            setClientSecret(data.clientSecret);
            setShowPaymentForm(true);

            setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to initialise payment. Please try again.";
            // Catch any safeJson error codes
            if (msg === "TOO_MANY_REQUESTS" || msg === "ACCESS_DENIED" || msg.startsWith("SERVER_ERROR_")) {
                setIsError(true);
                setUploadStatus(friendlyError(msg));
                return;
            }
            setIsError(true);
            setUploadStatus(msg);
        } finally {
            setIsCreatingPaymentIntent(false);
        }
    };

    const handlePaymentSuccess = async (paymentIntentId: string) => {
        if (!summaryData) return;

        setIsPaymentProcessing(true);
        setIsError(false);
        setUploadStatus("");

        try {
            const res = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: summaryData.jobId,
                    accessToken: summaryData.accessToken,
                    paymentIntentId,
                }),
            });

            const data = await safeJson<{ verified: boolean; alreadyProcessing?: boolean; error?: string }>(res);

            if (!res.ok || !data.verified) {
                setIsError(true);
                setUploadStatus("Payment received but processing failed. Please contact support with your reference ID.");
                setIsPaymentProcessing(false);
                return;
            }

            // Payment confirmed — now poll for job completion
            setView("processing_payment");
            startPolling(summaryData.jobId, summaryData.accessToken);
        } catch (err) {
            setIsError(true);
            setUploadStatus("Could not confirm payment. Please refresh or contact support.");
            setIsPaymentProcessing(false);
        }
    };
    const handlePaymentError = (msg: string) => {
        setIsError(true);
        setUploadStatus(msg);
    };

    const handleHidePaymentForm = () => {
        setShowPaymentForm(false);
        setClientSecret(null);
        setIsError(false);
        setUploadStatus("");
    };

    // ── Polling ───────────────────────────────────────────────────────────────
    const startPolling = (jobId: string, token: string) => {
        let count = 0;

        const poll = async () => {
            if (count >= MAX_POLLS) {
                setIsError(true);
                setUploadStatus("Taking longer than expected. Your payment was successful — please contact support with your reference ID.");
                setView("summary");
                return;
            }

            try {
                const res = await fetch(`/api/jobs/${jobId}/status?token=${token}`);

                // ── Token/session expired — auto-reset instead of broken UI ──
                if (res.status === 401 || res.status === 403) {
                    handleSessionExpired();
                    return;
                }

                if (!res.ok) {
                    const d = (await safeJson<{ error?: string }>(res).catch(() => ({}))) as { error?: string };
                    throw new Error(d.error || "Unable to retrieve results.");
                }

                const data = await safeJson<{
                    status: string;
                    detailedBreakdown?: string;
                    urgency?: string;
                    referenceId?: string;
                }>(res);

                if (data.status === "COMPLETED") {
                    if (data.detailedBreakdown) {
                        setCompletedData({
                            detailedBreakdown: data.detailedBreakdown,
                            urgency: (data.urgency ?? "Routine") as UrgencyLevel,
                            referenceId: data.referenceId ?? "",
                        });
                        setView("completed");
                        sessionStorage.removeItem(`job_${jobId}`);
                    } else {
                        // COMPLETED on backend but breakdown missing — don't loop, surface error
                        setIsError(true);
                        setUploadStatus("Your breakdown is complete but the content failed to load. Please contact support with your reference ID.");
                        setView("summary");
                    }
                    return;
                }

                if (data.status === "FAILED") {
                    setIsError(true);
                    setUploadStatus("We encountered an issue processing your document. Our team has been notified. Please contact support.");
                    setView("summary");
                    return;
                }

                const messages: Record<string, string> = {
                    PAYMENT_CONFIRMED: "Payment confirmed — queuing your detailed breakdown…",
                    PAID_BREAKDOWN_GENERATING: "Automated System is building your section-by-section breakdown… (~15 seconds)",
                };
                setPollStatus(messages[data.status] ?? "Processing your breakdown…");
            } catch (err) {
                const msg = err instanceof Error ? err.message : "";

                // Cloudflare / rate-limit errors during polling
                if (msg === "TOO_MANY_REQUESTS" || msg === "ACCESS_DENIED" || msg.startsWith("SERVER_ERROR_")) {
                    setIsError(true);
                    setUploadStatus(friendlyError(msg));
                    setView("summary");
                    return;
                }

                setIsError(true);
                setUploadStatus(msg || "Failed to retrieve results. Please refresh or contact support.");
                setView("summary");
                return;
            }

            count++;
            setPollCount(count);
            pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
        };

        pollTimerRef.current = setTimeout(poll, 2000);
    };

    // ── Download ──────────────────────────────────────────────────────────────
    const handleDownload = (fmt: string) => {
        if (!summaryData) return;
        window.open(`/api/download/${fmt}?job_id=${summaryData.jobId}&token=${summaryData.accessToken}`, "_blank");
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
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
        setClientSecret(null);
        setShowPaymentForm(false);
        setIsPaymentProcessing(false);
        setCategoryMismatch(null);
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    // ── Soft reset — keeps form data, only clears upload/result state ─────────
   // ── Soft reset — keeps form data, only clears upload/result state ─────────
    const handleRetryWithData = () => {
        setView("form");
        setFile(null);
        setUploadStatus("");
        setIsError(false);
        setSummaryData(null);
        setCompletedData(null);
        setSelectedUpsells([]);
        setCurrentStep(0);
        setClientSecret(null);
        setShowPaymentForm(false);
        setIsPaymentProcessing(false);
        setCategoryMismatch(null);
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        
        // Push the route for history
        router.push("/#upload");

        // Give React a few milliseconds to render the "form" view, 
        // then use your existing formRef to scroll right to it.
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    };

    const scrollToUpload = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <GlobalStyles />
            <div>
                {view === "form" && (
                    <div id="upload-section">
                        <HeroSection onScrollToUpload={scrollToUpload} />
                        <UploadSection
                            formRef={formRef}
                            categories={categories}
                            isLoadingCategories={isLoadingCategories}
                            isUploading={isUploading}
                            categoryId={categoryId}
                            setCategoryId={setCategoryId}
                            setSelectedUpsells={setSelectedUpsells}
                            firstName={firstName}
                            setFirstName={setFirstName}
                            email={email}
                            setEmail={setEmail}
                            marketingConsent={marketingConsent}
                            setMarketingConsent={setMarketingConsent}
                            file={file}
                            setFile={setFile}
                            isDragging={isDragging}
                            setIsDragging={setIsDragging}
                            handleDrop={handleDrop}
                            uploadStatus={uploadStatus}
                            isError={isError}
                            currentStep={currentStep}
                            handleSubmit={handleSubmit}
                            turnstileToken={turnstileToken}
                            setTurnstileToken={setTurnstileToken}
                            turnstileResetRef={turnstileResetRef} // ← add this
                        />
                    </div>
                )}

                {/* ── Category mismatch screen ── */}
                {view === "category_mismatch" && (
                    <div style={{ background: "#f8fafc", minHeight: "calc(100vh - 66px)" }}>
                        <CategoryMismatchView
                            categories={categories}
                            topCategories={categoryMismatch?.topCategories ?? []}
                            onRetry={handleRetryWithData}
                        />
                    </div>
                )}

                {(view === "summary" || view === "processing_payment") && summaryData && (
                    <div style={{ background: "#f8fafc", minHeight: "calc(100vh - 66px)" }}>
                        <SummaryView
                            summaryData={summaryData}
                            firstName={firstName}
                            upsells={upsells}
                            categoryId={categoryId}
                            selectedUpsells={selectedUpsells}
                            setSelectedUpsells={setSelectedUpsells}
                            disclaimerAcknowledged={disclaimerAcknowledged}
                            setDisclaimerAcknowledged={setDisclaimerAcknowledged}
                            categories={categories}
                            getBasePrice={getBasePrice}
                            getUpsellPrice={getUpsellPrice}
                            getTotalPrice={getTotalPrice}
                            clientSecret={clientSecret}
                            showPaymentForm={showPaymentForm}
                            isCreatingPaymentIntent={isCreatingPaymentIntent}
                            isPaymentProcessing={isPaymentProcessing}
                            setIsPaymentProcessing={setIsPaymentProcessing}
                            handleProceedToPayment={handleProceedToPayment}
                            handlePaymentSuccess={handlePaymentSuccess}
                            handlePaymentError={handlePaymentError}
                            onHidePaymentForm={handleHidePaymentForm}
                            uploadStatus={uploadStatus}
                            isError={isError}
                            handleReset={handleRetryWithData}
                            paymentRef={paymentRef}
                            view={view}
                            pollStatus={pollStatus}
                            pollCount={pollCount}
                            jobId={summaryData.jobId}
                            accessToken={summaryData.accessToken}
                        />
                    </div>
                )}

                {view === "completed" && summaryData && completedData && (
                    <div style={{ background: "#f8fafc", minHeight: "calc(100vh - 66px)" }}>
                        <CompletedView
                            summaryData={summaryData}
                            completedData={completedData}
                            handleDownload={handleDownload}
                            handleReset={handleRetryWithData}
                            jobId={summaryData.jobId}
                            accessToken={summaryData.accessToken}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

// ─── CategoryMismatchView ─────────────────────────────────────────────────────
function CategoryMismatchView({
    topCategories,
    onRetry,
    categories,
}: {
    topCategories: { name: string; confidence: number }[];
    onRetry: () => void;
    categories: { _id: string; name: string }[];
}) {
    return (
        <div
            style={{
                maxWidth: 580,
                margin: "0 auto",
                padding: "72px 24px 80px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
                fontFamily: "'Raleway', sans-serif",
            }}
        >
            {/* Icon */}
            <div
                className="anim-fadeUp"
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: "linear-gradient(135deg,#fff7ed,#fef3c7)",
                    border: "1.5px solid #fde68a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 28,
                    flexShrink: 0,
                }}
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
            </div>

            {/* Main card */}
            <div
                className="anim-fadeUp-1"
                style={{
                    width: "100%",
                    borderRadius: 24,
                    background: "#fff",
                    boxShadow: "0 2px 0 0 #e2e8f0, 0 8px 40px rgba(15,35,63,0.08)",
                    border: "1px solid #f1f5f9",
                    overflow: "hidden",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #0a1f36 0%, #0F233F 60%, #133352 100%)",
                        padding: "32px 36px 28px",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: -60,
                            right: -60,
                            width: 200,
                            height: 200,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }}
                    />
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(251,191,36,0.15)",
                            border: "1px solid rgba(251,191,36,0.35)",
                            borderRadius: 99,
                            padding: "4px 14px 4px 8px",
                            marginBottom: 14,
                        }}
                    >
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fbbf24", boxShadow: "0 0 6px #fbbf24" }} />
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#fbbf24", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            Category Mismatch
                        </span>
                    </div>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff", lineHeight: 1.15, margin: 0, letterSpacing: "-0.02em" }}>
                        Looks Like the Wrong{" "}
                        <span
                            style={{
                                background: "linear-gradient(90deg,#fbbf24,#f59e0b)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Category
                        </span>
                    </h2>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500, lineHeight: 1.5 }}>
                        Your document didn&apos;t match the selected category. Here&apos;s where our Automated Technology thinks it belongs:
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Top categories with confidence bars */}
                    {topCategories.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {topCategories.map((cat, i) => (
                                <div
                                    key={cat.name}
                                    style={{
                                        padding: "14px 18px",
                                        borderRadius: 14,
                                        background: i === 0 ? "linear-gradient(135deg,#f0fdfd,#e8faf9)" : "#f8fafc",
                                        border: `1.5px solid ${i === 0 ? "#b2eeec" : "#e2e8f0"}`,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {i === 0 && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="2.5">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            )}
                                            <span style={{ fontSize: "0.92rem", fontWeight: 800, color: i === 0 ? "#0F233F" : "#475569" }}>
                                                {cat.name}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: i === 0 ? "#12A1A6" : "#94a3b8" }}>
                                            {cat.confidence}%
                                        </span>
                                    </div>
                                    {/* Confidence bar */}
                                    <div style={{ height: 5, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                                        <div
                                            style={{
                                                height: "100%",
                                                width: `${cat.confidence}%`,
                                                borderRadius: 99,
                                                background: i === 0 ? "linear-gradient(90deg,#12A1A6,#54D6D4)" : "#cbd5e1",
                                                transition: "width 0.6s ease",
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Explanation */}
                    <div
                        style={{
                            padding: "16px 18px",
                            borderRadius: 14,
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#b45309"
                            strokeWidth="2"
                            style={{ flexShrink: 0, marginTop: 1 }}
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                        </svg>
                        <p style={{ fontSize: "0.85rem", color: "#78350f", lineHeight: 1.7, margin: 0 }}>
                            Please go back and re-upload your document with the correct category selected. If your document genuinely belongs to the
                            category you chose, it may have been misread — try uploading a clearer scan.
                        </p>
                    </div>

                    {/* CTA */}
                    <button
                        type="button"
                        onClick={onRetry}
                        style={{
                            width: "100%",
                            padding: "17px 28px",
                            borderRadius: 16,
                            background: "linear-gradient(135deg,#0F233F,#1a3a5c)",
                            color: "#fff",
                            border: "none",
                            fontFamily: "Raleway, sans-serif",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            boxShadow: "0 4px 20px rgba(15,35,63,0.25)",
                            letterSpacing: "0.01em",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 4,
                                background: "linear-gradient(180deg,#54D6D4,#12A1A6)",
                                borderRadius: "16px 0 0 16px",
                            }}
                        />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
                        </svg>
                        Go Back &amp; Re-upload
                    </button>
                    <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", margin: 0, fontWeight: 500 }}>
                        No charge has been made. You can re-upload with the correct category at no cost.
                    </p>
                </div>
            </div>
        </div>
    );
}
