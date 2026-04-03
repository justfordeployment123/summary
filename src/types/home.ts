// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface Category {
    _id: string;
    name: string;
    base_price: number;
}

export interface Upsell {
    _id: string;
    name: string;
    description?: string;
    is_active: boolean;
    category_prices?: Record<string, number>;
}

export interface SummaryData {
    summary: string;
    urgency: UrgencyLevel;
    jobId: string;
    accessToken: string;
}

export interface CompletedData {
    detailedBreakdown: string;
    urgency: UrgencyLevel;
    referenceId: string;
}

export type UrgencyLevel = "Routine" | "Important" | "Time-Sensitive";

export type ViewState = "form" | "summary" | "processing_payment" | "completed";

// ─── Config Types ─────────────────────────────────────────────────────────────

export interface UrgencyConfig {
    bg: string;
    text: string;
    dot: string;
    border: string;
    label: string;
}

// ─── Primitive Props ──────────────────────────────────────────────────────────

export interface SpinnerProps {
    size?: number;
}

export interface CheckIconProps {
    size?: number;
    color?: string;
}

// ─── Section/Component Props ──────────────────────────────────────────────────

export interface NavbarProps {
    onReset: () => void;
    onScrollToUpload: () => void;
    view: ViewState;
}

export interface HeroSectionProps {
    onScrollToUpload: () => void;
}

export interface CTABannerProps {
    onScrollToUpload: () => void;
}

export interface UpsellCardProps {
    upsell: Upsell;
    price: number;
    selected: boolean;
    onToggle: () => void;
    index: number;
}

export interface FAQItemProps {
    q: string;
    a: string;
}

export interface UploadSectionProps {
    formRef: React.RefObject<HTMLElement | null>;
    categories: Category[];
    isLoadingCategories: boolean;
    isUploading: boolean;
    categoryId: string;
    setCategoryId: (id: string) => void;
    setSelectedUpsells: (upsells: string[]) => void;
    firstName: string;
    setFirstName: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    marketingConsent: boolean;
    setMarketingConsent: (v: boolean) => void;
    file: File | null;
    setFile: (f: File | null) => void;
    isDragging: boolean;
    setIsDragging: (v: boolean) => void;
    handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    uploadStatus: string;
    isError: boolean;
    currentStep: number;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    turnstileToken: string | null;
    setTurnstileToken: (token: string | null) => void;
}

// ─── Stripe Payment Props ─────────────────────────────────────────────────────

export interface EmbeddedPaymentFormProps {
    clientSecret: string;
    totalPrice: number;
    onSuccess: () => void;
    onError: (msg: string) => void;
    isProcessing: boolean;
    setIsProcessing: (v: boolean) => void;
}

// ─── Summary View Props ───────────────────────────────────────────────────────

export interface SummaryViewProps {
    summaryData: SummaryData;
    firstName: string;
    upsells: Upsell[];
    categoryId: string;
    selectedUpsells: string[];
    setSelectedUpsells: (upsells: string[]) => void;
    disclaimerAcknowledged: boolean;
    setDisclaimerAcknowledged: (v: boolean) => void;
    categories: Category[];
    getBasePrice: () => number;
    getUpsellPrice: (u: Upsell) => number;
    getTotalPrice: () => number;
    // Stripe payment state — passed down so the embedded form works
    clientSecret: string | null;
    showPaymentForm: boolean;
    isCreatingPaymentIntent: boolean;
    isPaymentProcessing: boolean;
    setIsPaymentProcessing: (v: boolean) => void;
    handleProceedToPayment: () => void;
    handlePaymentSuccess: () => void;
    handlePaymentError: (msg: string) => void;
    onHidePaymentForm: () => void;
    // Status
    uploadStatus: string;
    isError: boolean;
    handleReset: () => void;
    // Refs & view state (needed for processing sub-view)
    paymentRef: React.RefObject<HTMLDivElement | null>;
    view: ViewState;
    pollStatus: string;
    pollCount: number;

    // ... all existing fields ...
    jobId: string;
    accessToken: string;
}

export interface ProcessingViewProps {
    pollStatus: string;
    pollCount: number;
}

export interface CompletedViewProps {
    summaryData: SummaryData;
    completedData: CompletedData;
    handleDownload: (fmt: string) => void;
    handleReset: () => void;
    jobId: string;
    accessToken: string;
}
