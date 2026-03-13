"use client";

import { useEffect, useState, useRef } from "react";
import { adminApi } from "@/lib/adminApi";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

interface Settings {
    ocr_confidence_flag_threshold: number;
    ocr_confidence_reject_threshold: number;
    openai_monthly_token_cap: number;
    openai_monthly_cost_cap: number;
    openai_alert_threshold_percent: number;
    openai_max_input_tokens: number;
    openai_max_output_tokens: number;
    openai_model: string;
    openai_input_word_limit: number;
    download_link_expiry_hours: number;
    disclaimer_text: string;
    disclaimer_checkbox_label: string;
    stuck_job_timeout_minutes: number;
    max_regeneration_attempts: number;
    file_retention_hours: number;
}

type SettingField = {
    key: keyof Settings;
    label: string;
    type: "number" | "text" | "textarea" | "select";
    unit?: string;
    options?: string[];
    description?: string;
};

type SettingSection = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    fields: SettingField[];
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
    ocr: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zm0 9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zm9.75-9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
            />
        </svg>
    ),
    ai: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
        </svg>
    ),
    files: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
        </svg>
    ),
    disclaimer: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
            />
        </svg>
    ),
    ops: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Partial<Settings>>({});
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<Record<string, "saved" | "error">>({});
    const [activeSection, setActiveSection] = useState("ocr");
    const [animating, setAnimating] = useState(false);
    const prevSection = useRef(activeSection);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const data = await adminApi.getSettings();
            setSettings(data.settings);
        } catch (err: any) {
            console.error("Failed to load settings:", err.message);
        } finally {
            setIsLoading(false);
        }
    }

    function switchSection(id: string) {
        if (id === activeSection || animating) return;
        setAnimating(true);
        setTimeout(() => {
            prevSection.current = activeSection;
            setActiveSection(id);
            setAnimating(false);
        }, 160);
    }

    async function saveSetting(key: keyof Settings, value: any) {
        setIsSaving(key);
        try {
            await adminApi.updateSetting(key as string, value);
            setSaveStatus((s) => ({ ...s, [key]: "saved" }));
            setTimeout(
                () =>
                    setSaveStatus((s) => {
                        const n = { ...s };
                        delete n[key];
                        return n;
                    }),
                2500,
            );
        } catch (err: any) {
            setSaveStatus((s) => ({ ...s, [key]: "error" }));
        } finally {
            setIsSaving(null);
        }
    }

    const SECTIONS: SettingSection[] = [
        {
            id: "ocr",
            title: "OCR & Extraction",
            description: "AWS Textract confidence thresholds for document processing.",
            icon: Icons.ocr,
            fields: [
                {
                    key: "ocr_confidence_flag_threshold",
                    label: "Flag Threshold",
                    type: "number",
                    unit: "%",
                    description: "Jobs below this confidence get a warning (default: 85%)",
                },
                {
                    key: "ocr_confidence_reject_threshold",
                    label: "Reject Threshold",
                    type: "number",
                    unit: "%",
                    description: "Jobs below this are rejected and deleted (default: 70%)",
                },
            ],
        },
        {
            id: "openai",
            title: "OpenAI / AI",
            description: "Token caps, cost limits, and model configuration.",
            icon: Icons.ai,
            fields: [
                {
                    key: "openai_model",
                    label: "Model",
                    type: "select",
                    options: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4-turbo"],
                    description: "OpenAI model used for all generation tasks",
                },
                {
                    key: "openai_input_word_limit",
                    label: "Input Word Cap",
                    type: "number",
                    unit: "words",
                    description: "Hard cap on input text before sending to OpenAI (default: 1,200)",
                },
                {
                    key: "openai_max_input_tokens",
                    label: "Max Input Tokens",
                    type: "number",
                    unit: "tokens",
                    description: "Per-request input token limit",
                },
                {
                    key: "openai_max_output_tokens",
                    label: "Max Output Tokens",
                    type: "number",
                    unit: "tokens",
                    description: "Per-request output token limit",
                },
                {
                    key: "openai_monthly_token_cap",
                    label: "Monthly Token Cap",
                    type: "number",
                    unit: "tokens",
                    description: "Auto-disables paid AI at 100% usage",
                },
                {
                    key: "openai_monthly_cost_cap",
                    label: "Monthly Cost Cap",
                    type: "number",
                    unit: "USD¢",
                    description: "Alternative cost-based monthly cap in cents",
                },
                {
                    key: "openai_alert_threshold_percent",
                    label: "Alert Threshold",
                    type: "number",
                    unit: "%",
                    description: "Send email alert at this % of monthly cap (default: 80%)",
                },
            ],
        },
        {
            id: "files",
            title: "Downloads & Files",
            description: "File retention and download link expiry settings.",
            icon: Icons.files,
            fields: [
                {
                    key: "download_link_expiry_hours",
                    label: "Download Link Expiry",
                    type: "number",
                    unit: "hours",
                    description: "How long download links stay active after job completion (default: 72h)",
                },
                {
                    key: "file_retention_hours",
                    label: "File Retention",
                    type: "number",
                    unit: "hours",
                    description: "How long uploaded files remain in S3 before deletion (default: 24h)",
                },
            ],
        },
        {
            id: "disclaimer",
            title: "Disclaimer",
            description: "Legal disclaimer text and acknowledgement checkbox shown before payment.",
            icon: Icons.disclaimer,
            fields: [
                { key: "disclaimer_text", label: "Disclaimer Text", type: "textarea", description: "Shown prominently before payment options" },
                {
                    key: "disclaimer_checkbox_label",
                    label: "Checkbox Label",
                    type: "text",
                    description: "Label for the mandatory acknowledgement checkbox",
                },
            ],
        },
        {
            id: "ops",
            title: "Operations",
            description: "Stuck job timeouts and admin operation limits.",
            icon: Icons.ops,
            fields: [
                {
                    key: "stuck_job_timeout_minutes",
                    label: "Stuck Job Timeout",
                    type: "number",
                    unit: "mins",
                    description: "Flag jobs stuck in processing longer than this duration",
                },
                {
                    key: "max_regeneration_attempts",
                    label: "Max Regeneration Attempts",
                    type: "number",
                    description: "Maximum times admin can regenerate a failed job (default: 3)",
                },
            ],
        },
    ];

    const getValue = (key: keyof Settings): any => settings[key] ?? "";
    const currentSection = SECTIONS.find((s) => s.id === activeSection)!;

    // return (
    //     <div className="flex h-screen bg-[#f8f9fb]">
    //         {/* <AdminSidebar /> */}

    //         <div className="flex-1 flex flex-col overflow-hidden">
    //             {/* <AdminHeader /> */}

    //             <main className="flex-1 overflow-y-auto">
    //                 {isLoading ? (
    //                     <div className="flex items-center justify-center h-full">
    //                         <div className="w-7 h-7 border-[2.5px] border-teal-500 border-t-transparent rounded-full animate-spin" />
    //                     </div>
    //                 ) : (
    //                     <div className="p-8 space-y-7 max-w-3xl">
    //                         {/* ── Page Header ── */}
    //                         <div>
    //                             <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-600 mb-1">Configuration</p>
    //                             <h1 className="text-[1.65rem] font-bold text-slate-900 leading-tight tracking-tight">Settings</h1>
    //                             <p className="text-sm text-slate-500 mt-1.5">Configure system behaviour, AI limits, and content settings.</p>
    //                         </div>

    //                         {/* ── Tab Nav ── */}
    //                         <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap">
    //                             {SECTIONS.map((section) => {
    //                                 const isActive = activeSection === section.id;
    //                                 return (
    //                                     <button
    //                                         key={section.id}
    //                                         onClick={() => switchSection(section.id)}
    //                                         className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
    //                                             isActive
    //                                                 ? "bg-teal-600 text-white shadow-sm shadow-teal-600/25"
    //                                                 : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    //                                         }`}
    //                                     >
    //                                         <span className={`transition-colors ${isActive ? "text-white/80" : "text-slate-400"}`}>
    //                                             {section.icon}
    //                                         </span>
    //                                         {section.title}
    //                                     </button>
    //                                 );
    //                             })}
    //                         </div>

    //                         {/* ── Section Content (animated) ── */}
    //                         <div
    //                             className="transition-all duration-150"
    //                             style={{
    //                                 opacity: animating ? 0 : 1,
    //                                 transform: animating ? "translateY(6px)" : "translateY(0)",
    //                             }}
    //                         >
    //                             {currentSection && (
    //                                 <div className="space-y-4">
    //                                     {/* Section description */}
    //                                     <div className="flex items-center gap-3 pb-1">
    //                                         <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
    //                                             {currentSection.icon}
    //                                         </div>
    //                                         <p className="text-sm text-slate-500">{currentSection.description}</p>
    //                                     </div>

    //                                     {/* Fields */}
    //                                     {currentSection.fields.map((field, idx) => (
    //                                         <SettingCard
    //                                             key={field.key}
    //                                             field={field}
    //                                             value={getValue(field.key)}
    //                                             onChange={(val) => setSettings((s) => ({ ...s, [field.key]: val }))}
    //                                             onSave={() => saveSetting(field.key, getValue(field.key))}
    //                                             isSaving={isSaving === field.key}
    //                                             status={saveStatus[field.key]}
    //                                             animDelay={idx * 40}
    //                                         />
    //                                     ))}
    //                                 </div>
    //                             )}
    //                         </div>
    //                     </div>
    //                 )}
    //             </main>
    //         </div>
    //     </div>
    // );
    return (
        <div className="flex-1 overflow-y-auto">
            {isLoading ? (
                <div className="flex items-center justify-center h-full min-h-[50vh]">
                    <div className="w-7 h-7 border-[2.5px] border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="p-8 space-y-7 max-w-3xl">
                    {/* ── Page Header ── */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-600 mb-1">Configuration</p>
                        <h1 className="text-[1.65rem] font-bold text-slate-900 leading-tight tracking-tight">Settings</h1>
                        <p className="text-sm text-slate-500 mt-1.5">Configure system behaviour, AI limits, and content settings.</p>
                    </div>

                    {/* ── Tab Nav ── */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap">
                        {SECTIONS.map((section) => {
                            const isActive = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => switchSection(section.id)}
                                    className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                        isActive
                                            ? "bg-teal-600 text-white shadow-sm shadow-teal-600/25"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <span className={`transition-colors ${isActive ? "text-white/80" : "text-slate-400"}`}>{section.icon}</span>
                                    {section.title}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Section Content (animated) ── */}
                    <div
                        className="transition-all duration-150"
                        style={{
                            opacity: animating ? 0 : 1,
                            transform: animating ? "translateY(6px)" : "translateY(0)",
                        }}
                    >
                        {currentSection && (
                            <div className="space-y-4">
                                {/* Section description */}
                                <div className="flex items-center gap-3 pb-1">
                                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                        {currentSection.icon}
                                    </div>
                                    <p className="text-sm text-slate-500">{currentSection.description}</p>
                                </div>

                                {/* Fields */}
                                {currentSection.fields.map((field, idx) => (
                                    <SettingCard
                                        key={field.key}
                                        field={field}
                                        value={getValue(field.key)}
                                        onChange={(val) => setSettings((s) => ({ ...s, [field.key]: val }))}
                                        onSave={() => saveSetting(field.key, getValue(field.key))}
                                        isSaving={isSaving === field.key}
                                        status={saveStatus[field.key]}
                                        animDelay={idx * 40}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Setting Card ─────────────────────────────────────────────────────────────
function SettingCard({
    field,
    value,
    onChange,
    onSave,
    isSaving,
    status,
    animDelay,
}: {
    field: SettingField;
    value: any;
    onChange: (val: any) => void;
    onSave: () => void;
    isSaving: boolean;
    status?: "saved" | "error";
    animDelay: number;
}) {
    const inputClass =
        "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-sm text-slate-900 placeholder:text-slate-300 bg-white transition-all";

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden" style={{ animationDelay: `${animDelay}ms` }}>
            {/* Card header */}
            <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-slate-50">
                <div>
                    <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                    {field.description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{field.description}</p>}
                </div>
                {/* Save status badge */}
                <div className="shrink-0 h-6 flex items-center">
                    {status === "saved" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full transition-all">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Saved
                        </span>
                    )}
                    {status === "error" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Error
                        </span>
                    )}
                </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4 flex items-end gap-3">
                <div className="flex-1">
                    {field.type === "textarea" ? (
                        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`${inputClass} resize-none`} />
                    ) : field.type === "select" ? (
                        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
                            {field.options?.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="flex items-center gap-2.5">
                            <input
                                type={field.type}
                                value={value}
                                onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
                                className={inputClass}
                            />
                            {field.unit && (
                                <span className="text-xs font-semibold text-slate-400 shrink-0 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                                    {field.unit}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 active:scale-[0.97] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-teal-600/20"
                >
                    {isSaving ? (
                        <>
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Saving
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                />
                            </svg>
                            Save
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
