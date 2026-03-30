"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GlobalStyles, HeroSection, UploadSection, SummaryView, CompletedView } from "@/components/home";
import { PROCESS_STEPS, MAX_POLLS, POLL_INTERVAL } from "@/lib/homeUtils";
import type { Category, Upsell, SummaryData, CompletedData, ViewState, UrgencyLevel } from "@/types/home";

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
    // add this state near your other useState hooks
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isError, setIsError] = useState(false);

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

    // ── Scroll on view change ─────────────────────────────────────────────────
    useEffect(() => {
        if (view === "summary" && paymentRef.current) {
            setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }
    }, [view]);

    // ── Cleanup polling on unmount ────────────────────────────────────────────
    useEffect(
        () => () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        },
        [],
    );

    // ── File drop ────────────────────────────────────────────────────────────
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
            setUploadStatus(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to initialise payment.");
            if (!data.clientSecret) throw new Error("No client secret returned.");

            setClientSecret(data.clientSecret);
            setShowPaymentForm(true);

            setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
        } catch (err) {
            setIsError(true);
            setUploadStatus(err instanceof Error ? err.message : "Failed to initialise payment. Please try again.");
        } finally {
            setIsCreatingPaymentIntent(false);
        }
    };

    const handlePaymentSuccess = () => {
        if (!summaryData) return;
        setView("processing_payment");
        startPolling(summaryData.jobId, summaryData.accessToken);
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
                if (!res.ok) {
                    const d = (await res.json().catch(() => ({}))) as { error?: string };
                    throw new Error(d.error || "Unable to retrieve results.");
                }
                const data = (await res.json()) as { status: string; detailedBreakdown?: string; urgency?: string; referenceId?: string };

                if (data.status === "COMPLETED" && data.detailedBreakdown) {
                    setCompletedData({
                        detailedBreakdown: data.detailedBreakdown,
                        urgency: (data.urgency ?? "Routine") as UrgencyLevel,
                        referenceId: data.referenceId ?? "",
                    });
                    setView("completed");
                    sessionStorage.removeItem(`job_${jobId}`);
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
                    PAID_BREAKDOWN_GENERATING: "AI is building your section-by-section breakdown… (~15 seconds)",
                };
                setPollStatus(messages[data.status] ?? "Processing your breakdown…");
            } catch (err) {
                setIsError(true);
                setUploadStatus(err instanceof Error ? err.message : "Failed to retrieve results. Please refresh or contact support.");
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
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const scrollToUpload = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <GlobalStyles />
            {/* The layout wrapper inside the body handles the font-family and min-height now, 
                but we'll keep this div to hold the views */}
            <div>
                {/* Navbar is now handled globally in src/app/layout.tsx */}

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
                            handleReset={handleReset}
                            paymentRef={paymentRef}
                            view={view}
                            pollStatus={pollStatus}
                            pollCount={pollCount}
                        />
                    </div>
                )}

                {view === "completed" && summaryData && completedData && (
                    <div style={{ background: "#f8fafc", minHeight: "calc(100vh - 66px)" }}>
                        <CompletedView
                            summaryData={summaryData}
                            completedData={completedData}
                            handleDownload={handleDownload}
                            handleReset={handleReset}
                        />
                    </div>
                )}

                {/* Footer is now handled globally in src/app/layout.tsx */}
            </div>
        </>
    );
}
