"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    GlobalStyles,
    Navbar,
    HeroSection,
    HowItWorksSection,
    UploadSection,
    FAQSection,
    CTABanner,
    Footer,
    SummaryView,
    ProcessingView,
    CompletedView,
} from "@/components/home";
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
    const [isUploading, setIsUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isError, setIsError] = useState(false);

    // ── View / result state ───────────────────────────────────────────────────
    const [view, setView] = useState<ViewState>("form");
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [completedData, setCompletedData] = useState<CompletedData | null>(null);
    const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);

    // ── Polling state ─────────────────────────────────────────────────────────
    const [pollCount, setPollCount] = useState(0);
    const [pollStatus, setPollStatus] = useState("Verifying payment…");
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const formRef = useRef<HTMLElement | null>(null);

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
                // silently fail — user will see empty dropdown
            } finally {
                setIsLoadingCategories(false);
            }
        }
        fetchData();
    }, []);

    useEffect(
        () => () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        },
        [],
    );

    // ── Handlers ──────────────────────────────────────────────────────────────
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
            });

            setCurrentStep(1);
            setUploadStatus(PROCESS_STEPS[1]);
            await uploadFileToS3(presignedUrl, file);

            setCurrentStep(2);
            setUploadStatus(PROCESS_STEPS[2]);
            const ocrResult = await triggerOCR({ jobId, s3Key, fileType: file.type });

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

    // ── Payment ───────────────────────────────────────────────────────────────
    const handleProceedToPayment = async () => {
        if (!disclaimerAcknowledged || !summaryData) return;
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
            startPolling(summaryData.jobId, summaryData.accessToken);
            setView("processing_payment");
        } catch (err) {
            setIsError(true);
            setUploadStatus(err instanceof Error ? err.message : "Failed to initialise payment.");
        } finally {
            setIsCreatingPaymentIntent(false);
        }
    };

    const startPolling = (jobId: string, token: string) => {
        let count = 0;
        const poll = async () => {
            if (count >= MAX_POLLS) {
                setIsError(true);
                setUploadStatus("Taking longer than expected — contact support.");
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
                    setUploadStatus("We encountered an issue. Please contact support.");
                    setView("summary");
                    return;
                }
                const msgs: Record<string, string> = {
                    PAYMENT_CONFIRMED: "Payment confirmed — queuing breakdown…",
                    PAID_BREAKDOWN_GENERATING: "AI is building your breakdown… (~15 seconds)",
                };
                setPollStatus(msgs[data.status] ?? "Processing…");
            } catch (err) {
                setIsError(true);
                setUploadStatus(err instanceof Error ? err.message : "Failed to retrieve results.");
                setView("summary");
                return;
            }
            count++;
            setPollCount(count);
            pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
        };
        pollTimerRef.current = setTimeout(poll, 2000);
    };

    const handleDownload = (fmt: string) => {
        if (!summaryData) return;
        window.open(`/api/download/${fmt}?job_id=${summaryData.jobId}&token=${summaryData.accessToken}`, "_blank");
    };

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
        setIsCreatingPaymentIntent(false);
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const scrollToUpload = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <GlobalStyles />
            <div style={{ minHeight: "100vh", fontFamily: "'Raleway',sans-serif" }}>
                <Navbar onReset={handleReset} onScrollToUpload={scrollToUpload} view={view} />

                <div style={{ paddingTop: 66 }}>
                    {view === "form" && (
                        <>
                            <HeroSection onScrollToUpload={scrollToUpload} />
                            <HowItWorksSection />
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
                            />
                            <FAQSection />
                            <CTABanner onScrollToUpload={scrollToUpload} />
                        </>
                    )}

                    {view === "summary" && summaryData && (
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
                                handleProceedToPayment={handleProceedToPayment}
                                isCreatingPaymentIntent={isCreatingPaymentIntent}
                                uploadStatus={uploadStatus}
                                isError={isError}
                                handleReset={handleReset}
                            />
                        </div>
                    )}

                    {view === "processing_payment" && (
                        <div style={{ background: "#f8fafc", minHeight: "calc(100vh - 66px)" }}>
                            <ProcessingView pollStatus={pollStatus} pollCount={pollCount} />
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

                    <Footer />
                </div>
            </div>
        </>
    );
}
