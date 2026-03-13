"use client";

import { useEffect, useState } from "react";

interface Prompt {
    id: string;
    categoryId: string;
    categoryName: string;
    type: "free" | "paid" | "upsell";
    promptText: string;
    version: number;
    isActive: boolean;
    updatedAt: string;
}

interface PromptVersion {
    version: number;
    promptText: string;
    updatedAt: string;
}

export default function AdminPromptsPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [editText, setEditText] = useState("");
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [filterType, setFilterType] = useState<"all" | "free" | "paid">("all");

    useEffect(() => {
        fetchPrompts();
    }, []);

    async function fetchPrompts() {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/prompts");
            if (!res.ok) throw new Error("Failed to load prompts");
            const data = await res.json();
            setPrompts(data.prompts);
        } catch (err: any) {
            setStatusMsg(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    async function selectPrompt(prompt: Prompt) {
        setSelectedPrompt(prompt);
        setEditText(prompt.promptText);
        setStatusMsg("");
        setVersions([]);

        // Load version history
        setIsLoadingVersions(true);
        try {
            const res = await fetch(`/api/admin/prompts/${prompt.id}/versions`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setVersions(data.versions);
        } catch {
            // versions not critical
        } finally {
            setIsLoadingVersions(false);
        }
    }

    async function savePrompt() {
        if (!selectedPrompt || !editText.trim()) return;
        setIsSaving(true);
        setStatusMsg("");

        try {
            const res = await fetch(`/api/admin/prompts/${selectedPrompt.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ promptText: editText }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            setStatusMsg("✅ Prompt saved successfully. New version created.");
            fetchPrompts();
            // Update selected prompt with new version
            setSelectedPrompt({ ...selectedPrompt, promptText: editText, version: data.version });
        } catch (err: any) {
            setStatusMsg(`❌ ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    }

    async function restoreVersion(version: PromptVersion) {
        if (!confirm(`Restore version ${version.version}? This will create a new version with the old text.`)) return;
        setEditText(version.promptText);
        setStatusMsg("Version loaded into editor. Click Save to apply.");
    }

    const filteredPrompts = prompts.filter((p) => filterType === "all" || p.type === filterType);

    const PLACEHOLDER_HELP = `Available placeholders:
{{document_text}} — the extracted letter text
{{category}} — the letter category
{{urgency}} — the urgency level`;

    return (
        <div className="flex h-full" style={{ minHeight: "calc(100vh - 64px)" }}>
            {/* Left panel */}
            <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-sm font-bold text-slate-700 mb-3">Prompt Templates</h2>
                    <div className="flex gap-1">
                        {(["all", "free", "paid"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                                    filterType === t ? "bg-teal-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-20">
                            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        filteredPrompts.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => selectPrompt(p)}
                                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-white transition-colors ${
                                    selectedPrompt?.id === p.id ? "bg-white border-l-2 border-l-teal-500" : ""
                                }`}
                            >
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-semibold text-slate-700">{p.categoryName}</span>
                                    <span
                                        className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                                            p.type === "free"
                                                ? "bg-teal-100 text-teal-700"
                                                : p.type === "paid"
                                                  ? "bg-purple-100 text-purple-700"
                                                  : "bg-orange-100 text-orange-700"
                                        }`}
                                    >
                                        {p.type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-400">v{p.version}</span>
                                    {!p.isActive && <span className="text-xs text-red-400">• inactive</span>}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Editor panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedPrompt ? (
                    <>
                        {/* Editor header */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-white">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        {selectedPrompt.categoryName} — {selectedPrompt.type.charAt(0).toUpperCase() + selectedPrompt.type.slice(1)}{" "}
                                        Prompt
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Version {selectedPrompt.version} · Last updated{" "}
                                        {new Date(selectedPrompt.updatedAt).toLocaleDateString("en-GB")}
                                    </p>
                                </div>
                                <button
                                    onClick={savePrompt}
                                    disabled={isSaving || editText === selectedPrompt.promptText}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? "Saving…" : "Save & Version"}
                                </button>
                            </div>
                            {statusMsg && (
                                <p
                                    className={`text-xs mt-2 ${statusMsg.startsWith("✅") ? "text-teal-600" : statusMsg.startsWith("❌") ? "text-red-600" : "text-amber-600"}`}
                                >
                                    {statusMsg}
                                </p>
                            )}
                        </div>

                        {/* Textarea */}
                        <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
                            <div className="flex-1 relative">
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full h-full px-4 py-3 text-sm text-slate-700 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono leading-relaxed"
                                    placeholder="Enter your prompt template here…"
                                />
                            </div>

                            {/* Placeholder help */}
                            <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
                                <p className="text-xs font-semibold text-slate-600 mb-1">Available placeholders</p>
                                <div className="flex flex-wrap gap-2">
                                    {["{{document_text}}", "{{category}}", "{{urgency}}"].map((ph) => (
                                        <button
                                            key={ph}
                                            onClick={() => setEditText((t) => t + ph)}
                                            className="text-xs font-mono px-2 py-1 bg-white border border-slate-300 rounded hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors text-slate-600"
                                        >
                                            {ph}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Version history */}
                        {versions.length > 0 && (
                            <div className="px-6 pb-6">
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Version History</h4>
                                <div className="space-y-1 max-h-36 overflow-y-auto">
                                    {isLoadingVersions ? (
                                        <div className="text-xs text-slate-400 py-2">Loading versions…</div>
                                    ) : (
                                        versions.map((v) => (
                                            <div
                                                key={v.version}
                                                className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                                            >
                                                <span className="font-semibold text-slate-600">v{v.version}</span>
                                                <span className="text-slate-400">{new Date(v.updatedAt).toLocaleString("en-GB")}</span>
                                                <button
                                                    onClick={() => restoreVersion(v)}
                                                    className="text-teal-600 hover:text-teal-700 font-semibold ml-2"
                                                >
                                                    Restore
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <div className="text-center">
                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                            <p className="text-sm">Select a prompt template to edit</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
