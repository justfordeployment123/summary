"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { requestUploadUrl, uploadFileToS3, triggerOCR, generateFreeSummary } from "@/lib/api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// ─── Stripe setup ────────────────────────────────────────────────────────────

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Types ───────────────────────────────────────────────────────────────────

type UrgencyLevel = "Routine" | "Important" | "Time-Sensitive";
type PageView = "form" | "summary" | "processing_payment" | "completed";

interface UpsellOption {
    _id: string;
    name: string;
    description: string;
    is_active: boolean;
    category_prices: Record<string, number>;
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
    base_price: number;
}

interface CompletedData {
    detailedBreakdown: string;
    urgency: string;
    referenceId: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<UrgencyLevel, { bg: string; text: string; dot: string; border: string }> = {
    Routine: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
    Important: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200" },
    "Time-Sensitive": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", border: "border-red-200" },
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

/**
 * Converts the markdown returned by GPT-4.1 into safe HTML.
 * Handles: ## headings, **bold**, bullet lists, numbered lists, --- dividers, blank lines.
 * No external dependency required — runs entirely in the browser.
 */
function markdownToHtml(md: string): string {
    if (!md) return "";

    const lines = md.split("\n");
    const out: string[] = [];
    let inUl = false;
    let inOl = false;

    const closeList = () => {
        if (inUl) {
            out.push("</ul>");
            inUl = false;
        }
        if (inOl) {
            out.push("</ol>");
            inOl = false;
        }
    };

    const parseLine = (line: string) =>
        line
            // **bold**
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            // *italic*
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            // `code`
            .replace(/`(.+?)`/g, "<code>$1</code>");

    for (const raw of lines) {
        const line = raw.trimEnd();

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
            closeList();
            out.push('<hr class="my-4 border-slate-200" />');
            continue;
        }

        // ### h3
        const h3 = line.match(/^###\s+(.*)/);
        if (h3) {
            closeList();
            out.push(`<h3 class="text-base font-bold text-slate-800 mt-5 mb-2">${parseLine(h3[1])}</h3>`);
            continue;
        }

        // ## h2
        const h2 = line.match(/^##\s+(.*)/);
        if (h2) {
            closeList();
            out.push(`<h2 class="text-lg font-bold text-slate-900 mt-6 mb-2">${parseLine(h2[1])}</h2>`);
            continue;
        }

        // # h1
        const h1 = line.match(/^#\s+(.*)/);
        if (h1) {
            closeList();
            out.push(`<h1 class="text-xl font-bold text-slate-900 mt-6 mb-3">${parseLine(h1[1])}</h1>`);
            continue;
        }

        // Unordered list: - item or * item
        const ul = line.match(/^[-*]\s+(.*)/);
        if (ul) {
            if (inOl) {
                out.push("</ol>");
                inOl = false;
            }
            if (!inUl) {
                out.push('<ul class="list-disc list-outside pl-5 space-y-1 my-2">');
                inUl = true;
            }
            out.push(`<li class="text-slate-700 text-sm leading-relaxed">${parseLine(ul[1])}</li>`);
            continue;
        }

        // Ordered list: 1. item
        const ol = line.match(/^\d+\.\s+(.*)/);
        if (ol) {
            if (inUl) {
                out.push("</ul>");
                inUl = false;
            }
            if (!inOl) {
                out.push('<ol class="list-decimal list-outside pl-5 space-y-1 my-2">');
                inOl = true;
            }
            out.push(`<li class="text-slate-700 text-sm leading-relaxed">${parseLine(ol[1])}</li>`);
            continue;
        }

        // Empty line
        if (line.trim() === "") {
            closeList();
            out.push('<div class="h-2"></div>');
            continue;
        }

        // Plain paragraph
        closeList();
        out.push(`<p class="text-slate-700 text-sm leading-relaxed">${parseLine(line)}</p>`);
    }

    closeList();
    return out.join("\n");
}

// ─── Upsell Card Component ────────────────────────────────────────────────────

interface UpsellCardProps {
    upsell: UpsellOption;
    price: number;
    selected: boolean;
    onToggle: () => void;
    index: number;
}

const UPSELL_ICONS: Record<string, string> = {
    "More Detail": `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"/>`,
    "Legal Formatting": `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c-.99.143-1.99.317-3 .52m3-.52L2.25 15.697c-.122.499.106 1.028.589 1.202a5.989 5.989 0 002.031.352 5.989 5.989 0 002.031-.352c.483-.174.711-.703.59-1.202L5.25 4.971z"/>`,
    "Tone Rewrite": `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>`,
};

const UPSELL_ACCENTS = [
    { ring: "#6366f1", glow: "#eef2ff", badge: "#4f46e5", label: "#e0e7ff" },
    { ring: "#0d9488", glow: "#f0fdf4", badge: "#0f766e", label: "#ccfbf1" },
    { ring: "#d97706", glow: "#fffbeb", badge: "#b45309", label: "#fef3c7" },
];

function UpsellCard({ upsell, price, selected, onToggle, index }: UpsellCardProps) {
    const accent = UPSELL_ACCENTS[index % UPSELL_ACCENTS.length];
    const iconPath = UPSELL_ICONS[upsell.name] || UPSELL_ICONS["More Detail"];

    return (
        <button
            type="button"
            onClick={onToggle}
            style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                width: "100%",
                padding: "16px",
                borderRadius: "14px",
                border: selected ? `2px solid ${accent.ring}` : "1.5px solid #e2e8f0",
                background: selected ? accent.glow : "#fafafa",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                outline: "none",
                boxShadow: selected ? `0 0 0 4px ${accent.ring}22` : "none",
            }}
        >
            {/* Icon bubble */}
            <div
                style={{
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: selected ? accent.badge : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.18s",
                    marginTop: 1,
                }}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={selected ? "#fff" : "#64748b"}
                    style={{ transition: "stroke 0.18s" }}
                    dangerouslySetInnerHTML={{ __html: iconPath }}
                />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: selected ? accent.badge : "#1e293b", lineHeight: 1.3 }}>{upsell.name}</span>
                    {price > 0 && (
                        <span
                            style={{
                                flexShrink: 0,
                                fontSize: 13,
                                fontWeight: 700,
                                color: selected ? accent.badge : "#475569",
                                background: selected ? accent.label : "#f1f5f9",
                                padding: "2px 8px",
                                borderRadius: 6,
                                transition: "all 0.18s",
                            }}
                        >
                            +{formatPrice(price)}
                        </span>
                    )}
                </div>
                {upsell.description && <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{upsell.description}</p>}
            </div>

            {/* Checkmark */}
            <div
                style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: selected ? `2px solid ${accent.badge}` : "2px solid #cbd5e1",
                    background: selected ? accent.badge : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.18s",
                    marginTop: 2,
                }}
            >
                {selected && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
        </button>
    );
}

// ─── Embedded Stripe Payment Form ─────────────────────────────────────────────

interface EmbeddedPaymentFormProps {
    clientSecret: string;
    totalPrice: number;
    onSuccess: () => void;
    onError: (msg: string) => void;
    isProcessing: boolean;
    setIsProcessing: (v: boolean) => void;
}

function EmbeddedPaymentForm({ clientSecret, totalPrice, onSuccess, onError, isProcessing, setIsProcessing }: EmbeddedPaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();

    const handlePay = async () => {
        if (!stripe || !elements) return;
        setIsProcessing(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href },
            redirect: "if_required",
        });

        if (error) {
            onError(error.message || "Payment failed. Please try again.");
            setIsProcessing(false);
        } else {
            onSuccess();
        }
    };

    return (
        <div>
            <PaymentElement
                options={{
                    layout: "tabs",
                    fields: { billingDetails: "auto" },
                }}
            />
            <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing || !stripe || !elements}
                className="w-full mt-5 py-4 rounded-xl font-bold text-base bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Processing payment…
                    </span>
                ) : (
                    `Pay ${formatPrice(totalPrice)} — Get Breakdown →`
                )}
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

    // ── Embedded Stripe payment ──
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    // ── Payment polling ──
    const [pollCount, setPollCount] = useState(0);
    const [pollStatus, setPollStatus] = useState("Verifying payment…");
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Refs ──
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
            window.history.replaceState({}, "", window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        } catch (error: any) {
            setIsError(true);
            setUploadStatus(error.message || "Something went wrong. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    // ─── Upsells for current category ────────────────────────────────────────

    /**
     * Only show upsells that have a configured price > 0 for the selected category.
     * If no upsells exist for this category, the section is hidden entirely.
     */
    const categoryUpsells = upsells.filter((u) => {
        const price = u.category_prices?.[categoryId];
        return typeof price === "number" && price > 0;
    });

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

    // ─── Create Payment Intent & show embedded form ───────────────────────────

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

            // Scroll to payment form
            setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
        } catch (error: any) {
            setIsError(true);
            setUploadStatus(error.message || "Failed to initialise payment. Please try again.");
        } finally {
            setIsCreatingPaymentIntent(false);
        }
    };

    const handlePaymentSuccess = () => {
        // Payment confirmed client-side — now poll for webhook-triggered breakdown
        if (!summaryData) return;
        setView("processing_payment");
        startPolling(summaryData.jobId, summaryData.accessToken);
    };

    const handlePaymentError = (msg: string) => {
        setIsError(true);
        setUploadStatus(msg);
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
        setClientSecret(null);
        setShowPaymentForm(false);
        setIsPaymentProcessing(false);
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
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${i === activeStep ? "bg-teal-600 text-white" : i < activeStep ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}
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
                                    onChange={(e) => {
                                        setCategoryId(e.target.value);
                                        setSelectedUpsells([]);
                                    }}
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
                                className={`relative mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging ? "border-teal-500 bg-teal-50" : file ? "border-teal-400 bg-teal-50/40" : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"} ${isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
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

                        {/* ── Full Breakdown card ── */}
                        <div ref={paymentRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Card header */}
                            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <svg
                                            className="text-teal-600"
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

                                {/* ── Upsells — only shown if category has configured upsells ── */}
                                {categoryUpsells.length > 0 && !showPaymentForm && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Optional add-ons</p>
                                            {selectedUpsells.length > 0 && (
                                                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                                    {selectedUpsells.length} selected
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2.5">
                                            {categoryUpsells.map((upsell, index) => (
                                                <UpsellCard
                                                    key={upsell._id}
                                                    upsell={upsell}
                                                    price={getUpsellPrice(upsell)}
                                                    selected={selectedUpsells.includes(upsell._id)}
                                                    onToggle={() => toggleUpsell(upsell._id)}
                                                    index={index}
                                                />
                                            ))}
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
                                            <span className="text-lg">{formatPrice(getTotalPrice())}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Disclaimer checkbox */}
                                {!showPaymentForm && (
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
                                )}

                                {/* Error */}
                                {uploadStatus && isError && (
                                    <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
                                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        {uploadStatus}
                                    </div>
                                )}

                                {/* ── Embedded Stripe Payment Panel ── */}
                                {showPaymentForm && clientSecret ? (
                                    <div className="space-y-4">
                                        {/* Divider with label */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-px bg-slate-200" />
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment details</span>
                                            <div className="flex-1 h-px bg-slate-200" />
                                        </div>

                                        {/* Stripe Elements wrapper */}
                                        <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                                            <Elements
                                                stripe={stripePromise}
                                                options={{
                                                    clientSecret,
                                                    appearance: {
                                                        theme: "stripe",
                                                        variables: {
                                                            colorPrimary: "#0d9488",
                                                            colorBackground: "#ffffff",
                                                            colorText: "#1e293b",
                                                            colorDanger: "#dc2626",
                                                            fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
                                                            borderRadius: "10px",
                                                            spacingUnit: "4px",
                                                        },
                                                        rules: {
                                                            ".Input": { border: "1.5px solid #e2e8f0", boxShadow: "none", padding: "11px 14px" },
                                                            ".Input:focus": { border: "1.5px solid #0d9488", boxShadow: "0 0 0 3px #ccfbf1" },
                                                            ".Label": { fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px" },
                                                            ".Tab": { border: "1.5px solid #e2e8f0", borderRadius: "10px" },
                                                            ".Tab--selected": { border: "1.5px solid #0d9488", backgroundColor: "#f0fdfa" },
                                                        },
                                                    },
                                                }}
                                            >
                                                <EmbeddedPaymentForm
                                                    clientSecret={clientSecret}
                                                    totalPrice={getTotalPrice()}
                                                    onSuccess={handlePaymentSuccess}
                                                    onError={handlePaymentError}
                                                    isProcessing={isPaymentProcessing}
                                                    setIsProcessing={setIsPaymentProcessing}
                                                />
                                            </Elements>
                                        </div>

                                        {/* Change mind — go back */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowPaymentForm(false);
                                                setClientSecret(null);
                                                setIsError(false);
                                                setUploadStatus("");
                                            }}
                                            className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
                                        >
                                            ← Back to options
                                        </button>
                                    </div>
                                ) : (
                                    /* ── Proceed to Payment CTA ── */
                                    !showPaymentForm && (
                                        <button
                                            type="button"
                                            onClick={handleProceedToPayment}
                                            disabled={!disclaimerAcknowledged || isCreatingPaymentIntent}
                                            className="w-full py-4 rounded-xl font-bold text-base bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
                                        >
                                            {isCreatingPaymentIntent ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                        />
                                                    </svg>
                                                    Preparing payment…
                                                </span>
                                            ) : (
                                                `Pay ${formatPrice(getTotalPrice())} — Get Breakdown →`
                                            )}
                                        </button>
                                    )
                                )}

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

                        {/* ── Payment processing overlay ── */}
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
                    VIEW: COMPLETED
                ══════════════════════════════════════════════════════════════ */}
                {view === "completed" && summaryData && completedData && (
                    <div className="space-y-5">
                        {/* Free summary */}
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

                        {/* Detailed breakdown */}
                        <div ref={resultRef} className="bg-white rounded-2xl shadow-sm border border-teal-200 overflow-hidden ring-1 ring-teal-100">
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

                            <div className="px-8 py-7">
                                <div className="max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(completedData.detailedBreakdown) }} />
                            </div>

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
