"use client";

import { useEffect, useState } from "react";
import { adminApi, type Prompt, type PromptVersion, type Category } from "@/lib/adminApi";

// ── Local types ──────────────────────────────────────────────────────────────

type FilterType = "all" | "free" | "paid" | "upsell";
type StatusMsg = { type: "success" | "error" | "info"; text: string };

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    free: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-400" },
    paid: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-400" },
    upsell: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" },
};

const PLACEHOLDERS = [
    { token: "{{document_text}}", desc: "Extracted letter content" },
    { token: "{{category}}", desc: "Letter category name" },
    { token: "{{urgency}}", desc: "Urgency classification" },
];

const TYPE_DESCRIPTIONS: Record<string, string> = {
    free: "100–130 word plain-English summary with urgency indicator.",
    paid: "Full structured breakdown with key points, actions, and next steps.",
    upsell: "Additional processing (tone rewrite, legal formatting, etc.).",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPromptsPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [editText, setEditText] = useState("");
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPrompt, setNewPrompt] = useState<{ categoryId: string; type: "free" | "paid" | "upsell"; promptText: string }>({
        categoryId: "",
        type: "free",
        promptText: "",
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // ── Effects ────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchPrompts();
        fetchCategories();
    }, []);

    useEffect(() => {
        setIsDirty(selectedPrompt ? editText !== selectedPrompt.promptText : false);
    }, [editText, selectedPrompt]);

    // ── Data fetching ──────────────────────────────────────────────────────

    async function fetchPrompts() {
        setIsLoading(true);
        try {
            const data = await adminApi.getPrompts();
            setPrompts(data.prompts);
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load prompts" });
        } finally {
            setIsLoading(false);
        }
    }

    async function fetchCategories() {
        try {
            const data = await adminApi.getCategories();
            setCategories(data.categories);
        } catch {
            // non-critical — category list is only needed for the create modal
        }
    }

    async function loadVersionHistory(promptId: string) {
        setIsLoadingVersions(true);
        setVersions([]);
        try {
            const data = await adminApi.getPromptVersions(promptId);
            setVersions(data.versions);
        } catch {
            // version history is non-critical
        } finally {
            setIsLoadingVersions(false);
        }
    }

    // ── Handlers ───────────────────────────────────────────────────────────

    async function selectPrompt(prompt: Prompt) {
        if (isDirty && !confirm("You have unsaved changes. Discard them?")) return;
        setSelectedPrompt(prompt);
        setEditText(prompt.promptText);
        setStatusMsg(null);
        loadVersionHistory(prompt.id);
    }

    async function savePrompt() {
        if (!selectedPrompt || !editText.trim()) return;
        setIsSaving(true);
        setStatusMsg(null);
        try {
            const result = await adminApi.updatePrompt(selectedPrompt.id, { promptText: editText });
            const updated: Prompt = {
                ...selectedPrompt,
                promptText: editText,
                version: result.version,
                updatedAt: result.updatedAt,
            };
            setSelectedPrompt(updated);
            setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setStatusMsg({ type: "success", text: `Version ${result.version} saved successfully.` });
            loadVersionHistory(selectedPrompt.id);
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
        } finally {
            setIsSaving(false);
        }
    }

    async function toggleActive() {
        if (!selectedPrompt) return;
        try {
            const result = await adminApi.patchPrompt(selectedPrompt.id, { isActive: !selectedPrompt.isActive });
            const updated: Prompt = { ...selectedPrompt, isActive: result.isActive };
            setSelectedPrompt(updated);
            setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setStatusMsg({ type: "info", text: `Prompt ${updated.isActive ? "activated" : "deactivated"}.` });
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update status" });
        }
    }

    function restoreVersion(version: PromptVersion) {
        if (!confirm(`Load version ${version.version} into the editor? You'll still need to save to apply it.`)) return;
        setEditText(version.promptText);
        setStatusMsg({ type: "info", text: `Version ${version.version} loaded. Click "Save & Version" to apply.` });
    }

    async function createPrompt() {
        if (!newPrompt.promptText.trim()) return;
        setIsCreating(true);
        try {
            await adminApi.createPrompt({
                categoryId: newPrompt.categoryId || null,
                type: newPrompt.type,
                promptText: newPrompt.promptText,
            });
            setShowCreateModal(false);
            setNewPrompt({ categoryId: "", type: "free", promptText: "" });
            await fetchPrompts();
            setStatusMsg({ type: "success", text: "New prompt template created." });
        } catch (err: unknown) {
            setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to create prompt" });
        } finally {
            setIsCreating(false);
        }
    }

    function insertPlaceholder(token: string) {
        const textarea = document.getElementById("prompt-editor") as HTMLTextAreaElement | null;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const next = editText.substring(0, start) + token + editText.substring(end);
            setEditText(next);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + token.length, start + token.length);
            }, 0);
        } else {
            setEditText((t) => t + token);
        }
    }

    // ── Derived data ───────────────────────────────────────────────────────

    const filteredPrompts = prompts.filter((p) => {
        const matchType = filterType === "all" || p.type === filterType;
        const matchSearch =
            searchQuery === "" ||
            p.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.promptText.toLowerCase().includes(searchQuery.toLowerCase());
        return matchType && matchSearch;
    });

    const grouped = filteredPrompts.reduce<Record<string, Prompt[]>>((acc, p) => {
        (acc[p.categoryName] ??= []).push(p);
        return acc;
    }, {});

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="flex h-full bg-slate-50" style={{ minHeight: "calc(100vh - 64px)" }}>
            {/* ── LEFT SIDEBAR ── */}
            <aside className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-white shadow-sm">
                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-sm font-bold text-slate-800 tracking-tight">Prompt Templates</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {prompts.length} template{prompts.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            New
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <svg
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-700 placeholder-slate-400"
                        />
                    </div>

                    {/* Type filters */}
                    <div className="flex gap-1">
                        {(["all", "free", "paid", "upsell"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                                    filterType === t ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Prompt list */}
                <div className="overflow-y-auto flex-1 py-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : Object.keys(grouped).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-slate-400">
                            <svg className="w-8 h-8 mb-2 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <p className="text-xs">No templates found</p>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([category, categoryPrompts]) => (
                            <div key={category} className="mb-1">
                                <div className="px-4 py-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{category}</span>
                                </div>
                                {categoryPrompts.map((p) => {
                                    const s = TYPE_STYLES[p.type];
                                    const isSelected = selectedPrompt?.id === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => selectPrompt(p)}
                                            className={`w-full text-left px-4 py-2.5 transition-all border-l-2 ${
                                                isSelected ? "bg-teal-50 border-l-teal-500" : "border-l-transparent hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${s.bg} ${s.text} ${s.border}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                    {p.type}
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] text-slate-400 font-mono">v{p.version}</span>
                                                    {!p.isActive && <span className="text-[10px] text-red-400 font-semibold">off</span>}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 truncate font-mono leading-relaxed">
                                                {p.promptText.substring(0, 55)}…
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* ── MAIN EDITOR ── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {selectedPrompt ? (
                    <>
                        {/* Editor header */}
                        <header className="px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h2 className="text-sm font-bold text-slate-800">{selectedPrompt.categoryName}</h2>
                                        <span className="text-slate-300">—</span>
                                        <span
                                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${TYPE_STYLES[selectedPrompt.type].bg} ${TYPE_STYLES[selectedPrompt.type].text} ${TYPE_STYLES[selectedPrompt.type].border}`}
                                        >
                                            {selectedPrompt.type.charAt(0).toUpperCase() + selectedPrompt.type.slice(1)} Prompt
                                        </span>
                                        {!selectedPrompt.isActive && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-semibold">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Version <span className="font-mono font-semibold text-slate-600">v{selectedPrompt.version}</span>
                                        {" · "}Last updated{" "}
                                        {new Date(selectedPrompt.updatedAt).toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                        {" · "}
                                        <span className="font-mono">{editText.length.toLocaleString()} chars</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={toggleActive}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                                            selectedPrompt.isActive
                                                ? "bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                        }`}
                                    >
                                        {selectedPrompt.isActive ? "Deactivate" : "Activate"}
                                    </button>

                                    <button
                                        onClick={savePrompt}
                                        disabled={isSaving || !isDirty}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                                </div>
                            </div>

                            {/* Status message */}
                            {statusMsg && (
                                <div
                                    className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-xs font-medium ${
                                        statusMsg.type === "success"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : statusMsg.type === "error"
                                              ? "bg-red-50 text-red-700 border border-red-200"
                                              : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                >
                                    {statusMsg.type === "success" && (
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {statusMsg.type === "error" && (
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                    {statusMsg.type === "info" && (
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    )}
                                    {statusMsg.text}
                                    <button onClick={() => setStatusMsg(null)} className="ml-auto hover:opacity-70">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </header>

                        {/* Editor body */}
                        <div className="flex-1 overflow-hidden flex flex-col p-5 gap-4 min-h-0">
                            {isDirty && (
                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    Unsaved changes
                                </div>
                            )}

                            {/* Textarea */}
                            <div className="flex-1 relative min-h-0">
                                <textarea
                                    id="prompt-editor"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full h-full px-4 py-3.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono leading-7 shadow-sm"
                                    placeholder="Enter your prompt template here…"
                                    spellCheck={false}
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] text-slate-300 font-mono pointer-events-none">
                                    {editText.split("\n").length} lines
                                </div>
                            </div>

                            {/* Placeholders */}
                            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm shrink-0">
                                <div className="flex items-center justify-between mb-2.5">
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Available Placeholders</p>
                                    <p className="text-[10px] text-slate-400">Click to insert at cursor</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {PLACEHOLDERS.map(({ token, desc }) => (
                                        <button
                                            key={token}
                                            onClick={() => insertPlaceholder(token)}
                                            title={desc}
                                            className="group flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all text-slate-600"
                                        >
                                            <svg
                                                className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-teal-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                            </svg>
                                            {token}
                                            <span className="text-[10px] text-slate-400 font-sans group-hover:text-teal-500">{desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Version history */}
                        {(versions.length > 0 || isLoadingVersions) && (
                            <div className="px-5 pb-5 shrink-0">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Version History</h4>
                                        <span className="text-xs text-slate-400">
                                            {versions.length} version{versions.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                                        {isLoadingVersions ? (
                                            <div className="flex items-center justify-center py-4">
                                                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            versions.map((v) => (
                                                <div
                                                    key={v.version}
                                                    className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors ${
                                                        v.version === selectedPrompt.version ? "bg-teal-50" : ""
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="font-mono text-xs font-bold text-slate-700 shrink-0">v{v.version}</span>
                                                        {v.version === selectedPrompt.version && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-600 rounded font-semibold shrink-0">
                                                                current
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-400 truncate font-mono">
                                                            {v.promptText.substring(0, 40)}…
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
                                                        {v.version !== selectedPrompt.version && (
                                                            <button
                                                                onClick={() => restoreVersion(v)}
                                                                className="text-xs text-teal-600 hover:text-teal-700 font-semibold hover:underline"
                                                            >
                                                                Restore
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center max-w-xs">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-slate-600 mb-1">Select a template</p>
                            <p className="text-xs text-slate-400">Choose a prompt from the left panel to view and edit it.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* ── CREATE MODAL ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800">Create New Prompt Template</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {/* Category select */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                                <select
                                    value={newPrompt.categoryId}
                                    onChange={(e) => setNewPrompt((p) => ({ ...p, categoryId: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
                                >
                                    <option value="">Generic (applies to all categories)</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Type toggle */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                                <div className="flex gap-2">
                                    {(["free", "paid", "upsell"] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setNewPrompt((p) => ({ ...p, type: t }))}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                                                newPrompt.type === t
                                                    ? `${TYPE_STYLES[t].bg} ${TYPE_STYLES[t].text} ${TYPE_STYLES[t].border} shadow-sm`
                                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5">{TYPE_DESCRIPTIONS[newPrompt.type]}</p>
                            </div>

                            {/* Prompt text */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prompt Text</label>
                                <textarea
                                    value={newPrompt.promptText}
                                    onChange={(e) => setNewPrompt((p) => ({ ...p, promptText: e.target.value }))}
                                    rows={6}
                                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-mono leading-relaxed text-slate-700"
                                    placeholder={`You are an expert document analyst. Given the following {{category}} letter:\n\n{{document_text}}\n\nPlease provide...`}
                                />
                                <div className="flex gap-1.5 mt-1.5">
                                    {PLACEHOLDERS.map(({ token }) => (
                                        <button
                                            key={token}
                                            onClick={() => setNewPrompt((p) => ({ ...p, promptText: p.promptText + token }))}
                                            className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-colors"
                                        >
                                            {token}
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
