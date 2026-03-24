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

// ─── Component Prop Types ─────────────────────────────────────────────────────

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

export interface SpinnerProps {
  size?: number;
}

export interface CheckIconProps {
  size?: number;
  color?: string;
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
}

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
  handleProceedToPayment: () => void;
  isCreatingPaymentIntent: boolean;
  uploadStatus: string;
  isError: boolean;
  handleReset: () => void;
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
}