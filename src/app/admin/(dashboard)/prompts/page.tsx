"use client";

import { useEffect, useState } from "react";
import { adminApi, type Prompt, type PromptVersion, type Category } from "@/lib/adminApi";

// ── Types ────────────────────────────────────────────────────────────────────

type TabType = "free" | "paid";
type StatusMsg = { type: "success" | "error" | "info"; text: string };

// ── Constants ────────────────────────────────────────────────────────────────

// {{urgency}} is only available in paid prompts — it is the OUTPUT of the free
// prompt stage, so it cannot be an input to the free prompt itself.
const PLACEHOLDERS: Record<"free" | "paid", { token: string; desc: string }[]> = {
    free: [
        { token: "{{document_text}}", desc: "Full extracted letter text sent to the model" },
        { token: "{{category}}", desc: "The letter category selected by the user (e.g. Legal, Medical)" },
    ],
    paid: [
        { token: "{{document_text}}", desc: "Full extracted letter text sent to the model" },
        { token: "{{category}}", desc: "The letter category selected by the user (e.g. Legal, Medical)" },
        { token: "{{urgency}}", desc: "Urgency from the free summary (Routine / Important / Time-Sensitive)" },
    ],
};

const TAB_INFO = {
    free: {
        label: "Free Summary Prompts",
        badge: "Free",
        badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
        description:
            "These prompts generate the 100–130 word plain-English summary shown to every user at no charge. They also classify urgency (Routine / Important / Time-Sensitive). Keep them concise and instructional — the AI must be told to stay within the word limit and end with the URGENCY: tag.",
        tip: "Tip: Always include the word limit instruction and the URGENCY: [level] format requirement. The system parses this tag to set the urgency badge.",
    },
    paid: {
        label: "Paid Breakdown Prompts",
        badge: "Paid",
        badgeStyle: "bg-violet-50 text-violet-700 border-violet-200",
        description:
            "These prompts generate the full structured breakdown unlocked after payment. They should produce a detailed, section-by-section analysis including key points, required actions, deadlines, clause explanations, and next steps. These are only triggered after a verified Stripe webhook — never on client redirect.",
        tip: "Tip: Structure the prompt to request numbered sections. Be specific about what each section should cover. Upsell instructions (Legal Formatting, Tone Rewrite, More Detail) are appended automatically by the system.",
    },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPromptsPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>("free");
    const [isLoading, setIsLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);

    // Editor modal state
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [editText, setEditText] = useState("");
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    // Create modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPrompt, setNewPrompt] = useState({ categoryId: "", promptText: "" });
    const [isCreating, setIsCreating] = useState(false);

    // ── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        setIsDirty(editingPrompt ? editText !== editingPrompt.promptText : false);
    }, [editText, editingPrompt]);

    // ── Data ─────────────────────────────────────────────────────────────────

    async function fetchAll() {
        setIsLoading(true);
        try {
            const [promptsData, categoriesData] = await Promise.all([adminApi.getPrompts(), adminApi.getCategories()]);
            setPrompts(promptsData.prompts);
            setCategories(categoriesData.categories);
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load data" });
        } finally {
            setIsLoading(false);
        }
    }

    async function loadVersions(promptId: string) {
        setIsLoadingVersions(true);
        setVersions([]);
        try {
            const data = await adminApi.getPromptVersions(promptId);
            setVersions(data.versions);
        } catch {
            // non-critical
        } finally {
            setIsLoadingVersions(false);
        }
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    function openEditor(prompt: Prompt) {
        setEditingPrompt(prompt);
        setEditText(prompt.promptText);
        setShowVersionHistory(false);
        setVersions([]);
        setStatusMsg(null);
        loadVersions(prompt.id);
    }

    function closeEditor() {
        if (isDirty && !confirm("You have unsaved changes. Discard them?")) return;
        setEditingPrompt(null);
        setEditText("");
        setIsDirty(false);
        setVersions([]);
        setShowVersionHistory(false);
    }

    async function savePrompt() {
        if (!editingPrompt || !editText.trim()) return;
        setIsSaving(true);
        setStatusMsg(null);
        try {
            const result = await adminApi.updatePrompt(editingPrompt.id, { promptText: editText });
            const updated: Prompt = { ...editingPrompt, promptText: editText, version: result.version, updatedAt: result.updatedAt };
            setEditingPrompt(updated);
            setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setStatusMsg({ type: "success", text: `Saved as version ${result.version}.` });
            loadVersions(editingPrompt.id);
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
        } finally {
            setIsSaving(false);
        }
    }

    async function toggleActive(prompt: Prompt, e: React.MouseEvent) {
        e.stopPropagation();
        try {
            await adminApi.patchPrompt(prompt.id, { isActive: !prompt.isActive });
            setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? { ...p, isActive: !p.isActive } : p)));
            if (editingPrompt?.id === prompt.id) {
                setEditingPrompt((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
            }
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update status" });
        }
    }

    function restoreVersion(v: PromptVersion) {
        if (!confirm(`Load version ${v.version} into the editor? Click Save & Version to apply.`)) return;
        setEditText(v.promptText);
        setStatusMsg({ type: "info", text: `Version ${v.version} loaded. Click Save & Version to apply it.` });
        setShowVersionHistory(false);
    }

    function insertPlaceholder(token: string) {
        const ta = document.getElementById("prompt-editor") as HTMLTextAreaElement | null;
        if (ta) {
            const s = ta.selectionStart,
                e = ta.selectionEnd;
            setEditText(editText.substring(0, s) + token + editText.substring(e));
            setTimeout(() => {
                ta.focus();
                ta.setSelectionRange(s + token.length, s + token.length);
            }, 0);
        } else {
            setEditText((t) => t + token);
        }
    }

    async function createPrompt() {
        if (!newPrompt.promptText.trim()) return;
        setIsCreating(true);
        try {
            await adminApi.createPrompt({
                categoryId: newPrompt.categoryId || null,
                type: activeTab,
                promptText: newPrompt.promptText,
            });
            setShowCreateModal(false);
            setNewPrompt({ categoryId: "", promptText: "" });
            await fetchAll();
            setStatusMsg({ type: "success", text: "New prompt template created." });
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to create" });
        } finally {
            setIsCreating(false);
        }
    }

    // ── Derived ───────────────────────────────────────────────────────────────

    const tabPrompts = prompts.filter((p) => p.type === activeTab);
    const info = TAB_INFO[activeTab];

    // Categories that don't yet have a prompt for this tab
    const existingCategoryIds = new Set(tabPrompts.map((p) => p.categoryId ?? "generic"));
    const missingCategories = categories.filter((c) => !existingCategoryIds.has(c._id));

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-6 max-w-full">
            {/* ── Page header ── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Prompt Templates</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage the instructions used to generate summaries and breakdowns. Changes take effect immediately — no redeployment
                        needed.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    New Template
                </button>
            </div>

            {/* ── Global status banner ── */}
            {statusMsg && !editingPrompt && (
                <div
                    className={`flex items-center gap-2 mb-5 px-4 py-3 rounded-lg text-sm font-medium border ${
                        statusMsg.type === "success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : statusMsg.type === "error"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                >
                    {statusMsg.text}
                    <button onClick={() => setStatusMsg(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 mb-0 border-b border-slate-200">
                {(["free", "paid"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                            activeTab === tab ? "border-teal-500 text-teal-600" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${TAB_INFO[tab].badgeStyle}`}>{TAB_INFO[tab].badge}</span>
                        {TAB_INFO[tab].label}
                        <span className="text-xs text-slate-400 font-normal">({prompts.filter((p) => p.type === tab).length})</span>
                    </button>
                ))}
            </div>

            {/* ── Info banner for active tab ── */}
            <div className="bg-slate-50 border border-slate-200 border-t-0 rounded-b-xl px-5 py-4 mb-6">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <div>
                        <p className="text-sm text-slate-600">{info.description}</p>
                        <p className="text-xs text-teal-600 font-medium mt-1.5">{info.tip}</p>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
                    {["CATEGORY", "VERSION", "LAST UPDATED", "STATUS", "ACTIONS"].map((h) => (
                        <span key={h} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {h}
                        </span>
                    ))}
                </div>

                {/* Rows */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tabPrompts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <svg className="w-10 h-10 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <p className="text-sm font-medium">No {activeTab} prompt templates yet</p>
                        <p className="text-xs mt-1">Click "New Template" to create one</p>
                    </div>
                ) : (
                    tabPrompts.map((prompt, idx) => (
                        <div
                            key={prompt.id}
                            className={`grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors ${
                                idx !== tabPrompts.length - 1 ? "border-b border-slate-100" : ""
                            }`}
                        >
                            {/* Category + preview */}
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-sm">{prompt.categoryName}</p>
                                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{prompt.promptText.substring(0, 80)}…</p>
                            </div>

                            {/* Version */}
                            <div>
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                    v{prompt.version}
                                </span>
                            </div>

                            {/* Last updated */}
                            <div className="text-sm text-slate-500">
                                {new Date(prompt.updatedAt).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </div>

                            {/* Status toggle */}
                            <div>
                                <button
                                    onClick={(e) => toggleActive(prompt, e)}
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                                        prompt.isActive
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${prompt.isActive ? "bg-emerald-400" : "bg-slate-400"}`} />
                                    {prompt.isActive ? "Active" : "Inactive"}
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openEditor(prompt)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))
                )}

                {/* Missing categories hint */}
                {!isLoading && missingCategories.length > 0 && (
                    <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                            />
                        </svg>
                        <p className="text-xs text-amber-700">
                            <span className="font-semibold">No {activeTab} prompt for:</span> {missingCategories.map((c) => c.name).join(", ")}. The
                            system will use a fallback hardcoded prompt until you create one.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="ml-auto text-xs font-semibold text-amber-700 underline hover:no-underline shrink-0"
                        >
                            Create now
                        </button>
                    </div>
                )}
            </div>

            {/* ── EDITOR MODAL ── */}
            {editingPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="text-sm font-bold text-slate-800">Editing: {editingPrompt.categoryName}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${TAB_INFO[activeTab].badgeStyle}`}>
                                        {TAB_INFO[activeTab].badge}
                                    </span>
                                    {!editingPrompt.isActive && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-semibold">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">
                                    Version <span className="font-mono font-semibold text-slate-600">v{editingPrompt.version}</span>
                                    {" · "}
                                    {editText.length.toLocaleString()} chars · {editText.split("\n").length} lines
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={(e) => toggleActive(editingPrompt, e)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                        editingPrompt.isActive
                                            ? "bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                    }`}
                                >
                                    {editingPrompt.isActive ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                    onClick={savePrompt}
                                    disabled={isSaving || !isDirty}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                                                />
                                            </svg>
                                            Save & Version
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={closeEditor}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Status message inside modal */}
                        {statusMsg && (
                            <div
                                className={`flex items-center gap-2 mx-6 mt-4 px-3 py-2 rounded-lg text-xs font-medium border ${
                                    statusMsg.type === "success"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : statusMsg.type === "error"
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                            >
                                {statusMsg.text}
                                <button onClick={() => setStatusMsg(null)} className="ml-auto opacity-50 hover:opacity-100">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Unsaved indicator */}
                        {isDirty && (
                            <div className="flex items-center gap-2 mx-6 mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Unsaved changes — click Save & Version to apply
                            </div>
                        )}

                        {/* What this prompt does — context guide */}
                        <div className="mx-6 mt-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                                {activeTab === "free" ? "What this prompt must do" : "What this prompt must do"}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">{info.description}</p>
                            <p className="text-xs text-teal-600 font-medium mt-1">{info.tip}</p>
                        </div>

                        {/* Textarea */}
                        <div className="flex-1 px-6 pt-4 pb-0 min-h-0">
                            <textarea
                                id="prompt-editor"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full h-64 px-4 py-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono leading-7 shadow-sm"
                                placeholder="Enter your prompt template here…"
                                spellCheck={false}
                            />
                        </div>

                        {/* Placeholders */}
                        <div className="px-6 pt-3">
                            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Insert Placeholder</p>
                                    <p className="text-[10px] text-slate-400">Clicks insert at cursor position</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {PLACEHOLDERS[activeTab].map(({ token, desc }) => (
                                        <button
                                            key={token}
                                            onClick={() => insertPlaceholder(token)}
                                            title={desc}
                                            className="group flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all text-slate-600"
                                        >
                                            {token}
                                            <span className="text-[10px] text-slate-400 font-sans group-hover:text-teal-500 hidden sm:inline">
                                                — {desc}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Version history toggle */}
                        <div className="px-6 py-4">
                            <button
                                onClick={() => setShowVersionHistory((v) => !v)}
                                className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                <svg
                                    className={`w-3.5 h-3.5 transition-transform ${showVersionHistory ? "rotate-90" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                                Version History ({versions.length})
                                <span className="text-[10px] text-slate-400 font-normal">— click Restore to load an old version into the editor</span>
                            </button>

                            {showVersionHistory && (
                                <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                                    {isLoadingVersions ? (
                                        <div className="flex items-center justify-center py-6">
                                            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : versions.length === 0 ? (
                                        <div className="py-6 text-center text-xs text-slate-400">No version history yet</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                                            {versions.map((v) => (
                                                <div
                                                    key={v.version}
                                                    className={`flex items-center justify-between px-4 py-2.5 ${v.version === editingPrompt.version ? "bg-teal-50" : "hover:bg-slate-50"}`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="font-mono text-xs font-bold text-slate-700 shrink-0">v{v.version}</span>
                                                        {v.version === editingPrompt.version && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-600 rounded font-semibold">
                                                                current
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-400 truncate font-mono">
                                                            {v.promptText.substring(0, 50)}…
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0 ml-3">
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(v.updatedAt).toLocaleDateString("en-GB", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric",
                                                            })}
                                                        </span>
                                                        {v.version !== editingPrompt.version && (
                                                            <button
                                                                onClick={() => restoreVersion(v)}
                                                                className="text-xs text-teal-600 hover:underline font-semibold"
                                                            >
                                                                Restore
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CREATE MODAL ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    Create {activeTab === "free" ? "Free Summary" : "Paid Breakdown"} Prompt
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {activeTab === "free"
                                        ? "This prompt generates the free 100–130 word summary shown before payment."
                                        : "This prompt generates the full paid breakdown after Stripe payment is confirmed."}
                                </p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {/* Category */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Category
                                    <span className="ml-1 text-slate-400 font-normal">— which letter type this prompt applies to</span>
                                </label>
                                <select
                                    value={newPrompt.categoryId}
                                    onChange={(e) => setNewPrompt((p) => ({ ...p, categoryId: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
                                >
                                    <option value="">Generic (fallback for all categories)</option>
                                    {categories
                                        .filter((c) => !existingCategoryIds.has(c._id))
                                        .map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name}
                                            </option>
                                        ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    A category-specific prompt takes priority over the generic one. If none exists for a category, the generic prompt
                                    is used.
                                </p>
                            </div>

                            {/* Prompt text */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Prompt Text
                                    <span className="ml-1 text-slate-400 font-normal">— the instruction sent to GPT-4.1</span>
                                </label>
                                <textarea
                                    value={newPrompt.promptText}
                                    onChange={(e) => setNewPrompt((p) => ({ ...p, promptText: e.target.value }))}
                                    rows={7}
                                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-mono leading-relaxed text-slate-700"
                                    placeholder={
                                        activeTab === "free"
                                            ? `You are a plain-English document simplifier.\nThe user has uploaded a {{category}} letter.\n\nSummarise in EXACTLY 100-130 words of plain English.\nEnd with: URGENCY: Routine|Important|Time-Sensitive\n\nDocument:\n{{document_text}}`
                                            : `You are an expert document analyst.\nProvide a full structured breakdown of this {{category}} letter.\n\n1. Overview\n2. Key Points\n3. Required Actions\n4. Deadlines\n5. Plain-English Explanation\n6. Next Steps\n\nDocument:\n{{document_text}}`
                                    }
                                />
                                {/* Placeholder buttons */}
                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                    {PLACEHOLDERS[activeTab].map(({ token }) => (
                                        <button
                                            key={token}
                                            onClick={() => setNewPrompt((p) => ({ ...p, promptText: p.promptText + token }))}
                                            className="text-[10px] font-mono px-2 py-1 bg-white border border-slate-200 rounded text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-colors"
                                        >
                                            + {token}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createPrompt}
                                disabled={isCreating || !newPrompt.promptText.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    "Create Template"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
