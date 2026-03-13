"use client";

import { useEffect, useState } from "react";

interface Settings {
    // OCR
    ocr_confidence_flag_threshold: number;
    ocr_confidence_reject_threshold: number;
    // OpenAI
    openai_monthly_token_cap: number;
    openai_monthly_cost_cap: number;
    openai_alert_threshold_percent: number;
    openai_max_input_tokens: number;
    openai_max_output_tokens: number;
    openai_model: string;
    openai_input_word_limit: number;
    // Pricing
    category_prices: Record<string, number>;
    // Downloads
    download_link_expiry_hours: number;
    // Disclaimer
    disclaimer_text: string;
    disclaimer_checkbox_label: string;
    // Stuck job timeout
    stuck_job_timeout_minutes: number;
    // Regeneration
    max_regeneration_attempts: number;
    // File retention
    file_retention_hours: number;
}

type SettingSection = {
    title: string;
    description: string;
    fields: SettingField[];
};

type SettingField = {
    key: keyof Settings;
    label: string;
    type: "number" | "text" | "textarea" | "select";
    unit?: string;
    options?: string[];
    description?: string;
};

const CATEGORIES = [
    "Legal",
    "Medical / NHS",
    "Government / HMRC / DWP",
    "Financial / Banking",
    "Housing / Landlord / Council",
    "Employment / HR",
    "Insurance",
    "General / Other",
];

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Partial<Settings>>({});
    const [categoryPrices, setCategoryPrices] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
    const [activeSection, setActiveSection] = useState("ocr");

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const res = await fetch("/api/admin/settings");
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setSettings(data.settings);
            setCategoryPrices(data.settings.category_prices ?? {});
        } catch (err: any) {
            setSaveStatus({ global: `Error loading: ${err.message}` });
        } finally {
            setIsLoading(false);
        }
    }

    async function saveSetting(key: string, value: any) {
        setIsSaving(true);
        setSaveStatus({});
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSaveStatus({ [key]: "✅ Saved" });
            setTimeout(() => setSaveStatus({}), 3000);
        } catch (err: any) {
            setSaveStatus({ [key]: `❌ ${err.message}` });
        } finally {
            setIsSaving(false);
        }
    }

    async function saveCategoryPrices() {
        await saveSetting("category_prices", categoryPrices);
    }

    const SECTIONS: SettingSection[] = [
        {
            title: "OCR & Extraction",
            description: "Configure AWS Textract confidence thresholds for document processing.",
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
                    description: "Jobs below this threshold are rejected and deleted (default: 70%)",
                },
            ],
        },
        {
            title: "OpenAI / AI",
            description: "Token caps, cost limits, and model configuration.",
            fields: [
                {
                    key: "openai_model",
                    label: "Model",
                    type: "select",
                    options: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4-turbo"],
                    description: "OpenAI model for all generation tasks",
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
                    unit: "USD cents",
                    description: "Alternative cost-based monthly cap",
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
            title: "Downloads & Files",
            description: "File retention and download link settings.",
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
            title: "Disclaimer",
            description: "Configure the legal disclaimer text and acknowledgement checkbox label.",
            fields: [
                {
                    key: "disclaimer_text",
                    label: "Disclaimer Text",
                    type: "textarea",
                    description: "Shown prominently before payment options",
                },
                {
                    key: "disclaimer_checkbox_label",
                    label: "Checkbox Label",
                    type: "text",
                    description: "Label for the mandatory acknowledgement checkbox",
                },
            ],
        },
        {
            title: "Operations",
            description: "Stuck job timeouts and admin operation limits.",
            fields: [
                {
                    key: "stuck_job_timeout_minutes",
                    label: "Stuck Job Timeout",
                    type: "number",
                    unit: "minutes",
                    description: "Flag jobs stuck in a processing state longer than this",
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

    const NAV_ITEMS = [
        ...SECTIONS.map((s) => ({ id: s.title.toLowerCase().replace(/[^a-z]/g, ""), label: s.title })),
        // { id: "pricing", label: "Pricing" },
    ];

    const getValue = (key: keyof Settings) => (settings as any)[key] ?? "";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full" style={{ minHeight: "calc(100vh - 64px)" }}>
            {/* Sidebar nav */}
            <div className="w-52 shrink-0 border-r border-slate-200 bg-slate-50 p-4 space-y-1">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Settings</h2>
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === item.id ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Main settings panel */}
            <div className="flex-1 overflow-y-auto p-8">
                {saveStatus.global && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{saveStatus.global}</div>
                )}

                {/* Dynamic sections */}
                {SECTIONS.map((section) => {
                    const sectionId = section.title.toLowerCase().replace(/[^a-z]/g, "");
                    if (activeSection !== sectionId) return null;
                    return (
                        <div key={section.title} className="max-w-2xl space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
                                <p className="text-sm text-slate-500 mt-1">{section.description}</p>
                            </div>

                            {section.fields.map((field) => (
                                <div key={field.key} className="bg-white rounded-xl border border-slate-200 p-5">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
                                            {field.description && <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>}
                                        </div>
                                        {saveStatus[field.key] && (
                                            <span
                                                className={`text-xs font-semibold ${saveStatus[field.key].startsWith("✅") ? "text-teal-600" : "text-red-600"}`}
                                            >
                                                {saveStatus[field.key]}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-3 items-end">
                                        {field.type === "textarea" ? (
                                            <textarea
                                                value={getValue(field.key)}
                                                onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                                                rows={4}
                                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                            />
                                        ) : field.type === "select" ? (
                                            <select
                                                value={getValue(field.key)}
                                                onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                            >
                                                {field.options?.map((o) => (
                                                    <option key={o}>{o}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2">
                                                <input
                                                    type={field.type}
                                                    value={getValue(field.key)}
                                                    onChange={(e) =>
                                                        setSettings((s) => ({
                                                            ...s,
                                                            [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                                                        }))
                                                    }
                                                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                />
                                                {field.unit && <span className="text-xs text-slate-400 shrink-0">{field.unit}</span>}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => saveSetting(field.key, getValue(field.key))}
                                            disabled={isSaving}
                                            className="px-4 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 shrink-0"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}

                {/* Pricing section */}
                {activeSection === "pricing" && (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Category Pricing</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Set the base price for the paid detailed breakdown per category. Prices are in pence (e.g. 499 = £4.99).
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {CATEGORIES.map((cat) => (
                                    <div key={cat} className="flex items-center justify-between px-5 py-4">
                                        <label className="text-sm font-medium text-slate-700">{cat}</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">£</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={categoryPrices[cat] !== undefined ? (categoryPrices[cat] / 100).toFixed(2) : "4.99"}
                                                onChange={(e) =>
                                                    setCategoryPrices((p) => ({ ...p, [cat]: Math.round(Number(e.target.value) * 100) }))
                                                }
                                                className="w-24 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-right"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                <span className="text-xs text-slate-400">Changes take effect immediately after saving.</span>
                                <button
                                    onClick={saveCategoryPrices}
                                    disabled={isSaving}
                                    className="px-5 py-2 rounded-lg text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? "Saving…" : "Save All Prices"}
                                </button>
                            </div>
                        </div>

                        {saveStatus["category_prices"] && (
                            <p
                                className={`text-sm font-semibold ${saveStatus["category_prices"].startsWith("✅") ? "text-teal-600" : "text-red-600"}`}
                            >
                                {saveStatus["category_prices"]}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
