"use client";

import { useEffect, useState } from "react";
import { adminApi, Category, Upsell } from "@/lib/adminApi";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({
    open,
    onClose,
    children,
}: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <div
            aria-modal="true"
            className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
        >
            <div
                className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300 ${
                    open ? "opacity-100" : "opacity-0"
                }`}
                onClick={onClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.18)] w-full max-w-130 mx-4 transition-all duration-300 max-h-[90vh] overflow-y-auto ${
                    open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-5 scale-[0.97]"
                }`}
            >
                {children}
            </div>
        </div>
    );
}

// ─── Category Price Row ───────────────────────────────────────────────────────
function CategoryPriceRow({
    category,
    price,
    onChange,
}: {
    category: Category;
    price: string | undefined;
    onChange: (val: string | undefined) => void;
}) {
    const included = price !== undefined;
    const priceNum = Number(price ?? "0");

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                included
                    ? "border-teal-400/60 bg-teal-50/50"
                    : "border-slate-200 bg-white hover:border-slate-300"
            }`}
        >
            {/* Toggle */}
            <button
                type="button"
                onClick={() => onChange(included ? undefined : "0")}
                className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
                    included ? "bg-teal-500" : "bg-slate-200"
                }`}
            >
                <span
                    className={`absolute top-0.75 left-0.75 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        included ? "translate-x-4" : "translate-x-0"
                    }`}
                />
            </button>

            {/* Category name */}
            <span className={`text-sm font-medium flex-1 truncate ${included ? "text-slate-800" : "text-slate-500"}`}>
                {category.name}
            </span>

            {/* Price input — only shown when toggled on */}
            {included ? (
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold select-none">p</span>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={price}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (/^\d*$/.test(v)) onChange(v);
                            }}
                            onKeyDown={(e) => { if (e.key === "." || e.key === ",") e.preventDefault(); }}
                            placeholder="299"
                            className="w-24 pl-6 pr-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-sm text-slate-900 placeholder:text-slate-300 transition-all"
                        />
                    </div>
                    {priceNum > 0 && (
                        <span className="text-xs text-teal-600 font-semibold w-12 text-right">
                            £{(priceNum / 100).toFixed(2)}
                        </span>
                    )}
                </div>
            ) : (
                <span className="text-xs text-slate-300 shrink-0">not included</span>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UpsellsPage() {
    const [upsells, setUpsells] = useState<Upsell[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Upsell | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // category_prices stored as Record<id, string|undefined> for controlled inputs
    // undefined = category not included in this upsell
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_active: true,
        category_prices: {} as Record<string, string | undefined>,
    });

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        try {
            const [upsellData, catData] = await Promise.all([
                adminApi.getUpsells(),
                adminApi.getCategories(),
            ]);
            setUpsells(upsellData.upsells);
            setCategories(catData.categories);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    function openAdd() {
        setIsEditing(false);
        setCurrentId(null);
        setFormData({ name: "", description: "", is_active: true, category_prices: {} });
        setError("");
        setFormOpen(true);
    }

    function openEdit(u: Upsell) {
        setIsEditing(true);
        setCurrentId(u._id);
        // Convert number values → strings for controlled inputs
        const pricesAsStrings: Record<string, string | undefined> = {};
        for (const [id, price] of Object.entries(u.category_prices)) {
            pricesAsStrings[id] = String(price);
        }
        setFormData({
            name: u.name,
            description: u.description,
            is_active: u.is_active,
            category_prices: pricesAsStrings,
        });
        setError("");
        setFormOpen(true);
    }

    function openDelete(u: Upsell) {
        setDeleteTarget(u);
        setDeleteOpen(true);
    }

    function setCategoryPrice(catId: string, val: string | undefined) {
        setFormData((prev) => {
            const next = { ...prev.category_prices };
            if (val === undefined) {
                delete next[catId];
            } else {
                next[catId] = val;
            }
            return { ...prev, category_prices: next };
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const includedEntries = Object.entries(formData.category_prices).filter(([, v]) => v !== undefined);
        if (includedEntries.length === 0) {
            setError("Please select at least one category and set its price.");
            return;
        }

        // Build numeric Record<string, number> for API
        const category_prices: Record<string, number> = {};
        for (const [id, val] of includedEntries) {
            category_prices[id] = parseInt(val as string, 10) || 0;
        }

        setSubmitting(true);
        try {
            const payload: Partial<Upsell> = {
                name: formData.name,
                description: formData.description,
                is_active: formData.is_active,
                category_prices,
            };
            if (isEditing && currentId) await adminApi.updateUpsell(currentId, payload);
            else await adminApi.createUpsell(payload);
            setFormOpen(false);
            fetchAll();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await adminApi.deleteUpsell(deleteTarget._id);
            setDeleteOpen(false);
            setDeleteTarget(null);
            fetchAll();
        } catch (err: any) {
            setError(err.message);
            setDeleteOpen(false);
        } finally {
            setSubmitting(false);
        }
    }

    const includedCount = Object.values(formData.category_prices).filter((v) => v !== undefined).length;

    return (
        <div className="flex h-screen bg-[#f8f9fb]">
            <AdminSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader />

                <main className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-7 h-7 border-[2.5px] border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="p-8 space-y-7">

                            {/* ── Header ── */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-600 mb-1">Configuration</p>
                                    <h1 className="text-[1.65rem] font-bold text-slate-900 leading-tight tracking-tight">
                                        Add-on Services
                                    </h1>
                                    <p className="text-sm text-slate-500 mt-1.5">
                                        Upsells shown at checkout — each with its own price per category.
                                    </p>
                                </div>
                                <button
                                    onClick={openAdd}
                                    className="group inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all duration-150 shadow-sm shadow-teal-600/20"
                                >
                                    <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </span>
                                    New Add-on
                                </button>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 border border-red-200/80 rounded-xl text-sm">
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            {/* ── Table ── */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">Add-on</th>
                                            <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">Categories & Prices</th>
                                            <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">Status</th>
                                            <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {upsells.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                                            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-700">No add-ons yet</p>
                                                            <p className="text-xs text-slate-400 mt-1">Create your first add-on service above.</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            upsells.map((u) => {
                                                const entries = Object.entries(u.category_prices);
                                                return (
                                                    <tr key={u._id} className="hover:bg-slate-50/60 transition-colors group">
                                                        <td className="px-6 py-4 max-w-50">
                                                            <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                                                            {u.description && (
                                                                <p className="text-xs text-slate-400 mt-0.5 truncate">{u.description}</p>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {entries.length === 0 ? (
                                                                <span className="text-xs text-slate-400">No categories set</span>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {entries.map(([id, price]) => {
                                                                        const catName = categories.find((c) => c._id === id)?.name ?? "Unknown";
                                                                        return (
                                                                            <span
                                                                                key={id}
                                                                                className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-medium"
                                                                            >
                                                                                {catName}
                                                                                <span className="text-teal-600 font-semibold ml-0.5">
                                                                                    £{(price / 100).toFixed(2)}
                                                                                </span>
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                u.is_active
                                                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                                                                    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                                                {u.is_active ? "Active" : "Disabled"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150">
                                                                <button
                                                                    onClick={() => openEdit(u)}
                                                                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 font-medium text-xs px-3 py-1.5 rounded-lg transition-all"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                                    </svg>
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => openDelete(u)}
                                                                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 font-medium text-xs px-3 py-1.5 rounded-lg transition-all"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                    </svg>
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── Add / Edit Modal ── */}
            <Modal open={formOpen} onClose={() => !submitting && setFormOpen(false)}>
                <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                {isEditing ? "Edit Add-on" : "New Add-on"}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {isEditing ? "Update this add-on service." : "Set up a new add-on service for checkout."}
                            </p>
                        </div>
                        <button
                            onClick={() => setFormOpen(false)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* ── Step 1: Details ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                                <span className="text-xs font-bold uppercase tracking-[0.09em] text-slate-600">Details</span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Express Delivery"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-sm text-slate-900 placeholder:text-slate-300 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Description <span className="font-normal text-slate-400">(optional)</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Short description shown at checkout…"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-sm text-slate-900 placeholder:text-slate-300 transition-all resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Active</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Show this add-on at checkout</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.is_active}
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                                        formData.is_active ? "bg-teal-500" : "bg-slate-200"
                                    }`}
                                >
                                    <span className={`absolute top-0.75 left-0.75 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                        formData.is_active ? "translate-x-5" : "translate-x-0"
                                    }`} />
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* ── Step 2: Category Prices ── */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                                    <span className="text-xs font-bold uppercase tracking-[0.09em] text-slate-600">Categories & Prices</span>
                                </div>
                                {includedCount > 0 && (
                                    <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
                                        {includedCount} selected
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">
                                Toggle each category this add-on applies to, then set its price in pence.
                            </p>

                            {categories.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                    No categories found. Create categories first.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {categories.map((cat) => (
                                        <CategoryPriceRow
                                            key={cat._id}
                                            category={cat}
                                            price={formData.category_prices[cat._id]}
                                            onChange={(val) => setCategoryPrice(cat._id, val)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="pt-1 flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setFormOpen(false)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm shadow-teal-600/20"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        Saving…
                                    </span>
                                ) : isEditing ? "Save Changes" : "Create Add-on"}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* ── Delete Modal ── */}
            <Modal open={deleteOpen} onClose={() => !submitting && setDeleteOpen(false)}>
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Delete add-on?</h2>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                <span className="font-semibold text-slate-700">"{deleteTarget?.name}"</span> will be permanently removed. This cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2.5">
                        <button
                            onClick={() => setDeleteOpen(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            disabled={submitting}
                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm shadow-red-600/20"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Deleting…
                                </span>
                            ) : "Delete Add-on"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}