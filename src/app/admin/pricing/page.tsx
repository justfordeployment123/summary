"use client";

import { useEffect, useState, useRef } from "react";
import { adminApi, Category } from "@/lib/adminApi";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

// ─── Smooth Modal Wrapper ────────────────────────────────────────────────────
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
                onClick={onClose}
            />
            {/* Panel */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transition-all duration-300 ${
                    open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
                }`}
            >
                {children}
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PricingPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal state
    const [formOpen, setFormOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        base_price: 499,
        is_active: true,
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            const data = await adminApi.getCategories();
            setCategories(data.categories);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const name = e.target.value;
        setFormData({
            ...formData,
            name,
            slug: name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, ""),
        });
    }

    function openAdd() {
        setIsEditing(false);
        setCurrentId(null);
        setFormData({ name: "", slug: "", base_price: 499, is_active: true });
        setError("");
        setFormOpen(true);
    }

    function openEdit(cat: Category) {
        setIsEditing(true);
        setCurrentId(cat._id);
        setFormData({
            name: cat.name,
            slug: cat.slug,
            base_price: cat.base_price,
            is_active: cat.is_active,
        });
        setError("");
        setFormOpen(true);
    }

    function openDelete(cat: Category) {
        setDeleteTarget(cat);
        setDeleteOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        try {
            if (isEditing && currentId) {
                await adminApi.updateCategory(currentId, formData);
            } else {
                await adminApi.createCategory(formData);
            }
            setFormOpen(false);
            fetchCategories();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;
        try {
            await adminApi.deleteCategory(deleteTarget._id);
            setDeleteOpen(false);
            setDeleteTarget(null);
            fetchCategories();
        } catch (err: any) {
            setError(err.message);
            setDeleteOpen(false);
        }
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <AdminSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader />

                <main className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="p-8 space-y-6">
                            {/* Page Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">Categories & Pricing</h1>
                                    <p className="text-sm text-slate-500 mt-1">Manage letter categories and their base processing prices.</p>
                                </div>
                                <button
                                    onClick={openAdd}
                                    className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-medium py-2.5 px-5 rounded-xl text-sm transition-all duration-150 shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    New Category
                                </button>
                            </div>

                            {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">{error}</div>}

                            {/* Full-Width Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wide text-xs">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Category</th>
                                            <th className="px-6 py-4 font-semibold">Slug</th>
                                            <th className="px-6 py-4 font-semibold">Base Price</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {categories.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <svg
                                                                className="w-6 h-6 text-slate-400"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth={1.5}
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                                                                />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-600">No categories yet</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">
                                                                Click the button above to create your first one.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            categories.map((cat) => (
                                                <tr key={cat._id} className="hover:bg-slate-50/70 transition-colors group">
                                                    <td className="px-6 py-4 font-semibold text-slate-900">{cat.name}</td>
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">/{cat.slug}</td>
                                                    <td className="px-6 py-4 font-semibold text-slate-800">£{(cat.base_price / 100).toFixed(2)}</td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                cat.is_active
                                                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                                    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`w-1.5 h-1.5 rounded-full ${cat.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                                                            />
                                                            {cat.is_active ? "Active" : "Disabled"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEdit(cat)}
                                                                className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 font-medium text-xs px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                <svg
                                                                    className="w-3.5 h-3.5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth={2}
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                                                    />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => openDelete(cat)}
                                                                className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 font-medium text-xs px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                <svg
                                                                    className="w-3.5 h-3.5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth={2}
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                                                    />
                                                                </svg>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
            <Modal open={formOpen} onClose={() => setFormOpen(false)}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{isEditing ? "Edit Category" : "New Category"}</h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {isEditing ? "Update the category details below." : "Fill in the details to create a new category."}
                            </p>
                        </div>
                        <button
                            onClick={() => setFormOpen(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleNameChange}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-shadow"
                                placeholder="e.g. Legal"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
                            <input
                                type="text"
                                required
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-slate-50 font-mono transition-shadow"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Price (pence)</label>
                            <input
                                type="number"
                                required
                                min={0}
                                value={formData.base_price}
                                onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-shadow"
                                placeholder="e.g. 499"
                            />
                            <p className="text-xs text-slate-500 mt-1.5 font-medium">= £{(formData.base_price / 100).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 py-1">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={formData.is_active}
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                className={`relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                                    formData.is_active ? "bg-teal-500" : "bg-slate-200"
                                }`}
                            >
                                <span
                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                        formData.is_active ? "translate-x-5" : "translate-x-1"
                                    }`}
                                />
                            </button>
                            <label
                                className="text-sm text-slate-700 font-medium select-none cursor-pointer"
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                            >
                                Active — visible to users
                            </label>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFormOpen(false)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm"
                            >
                                {isEditing ? "Save Changes" : "Create Category"}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* ── Delete Confirmation Modal ────────────────────────────────── */}
            <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Delete Category</h2>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                Are you sure you want to delete <span className="font-semibold text-slate-700">"{deleteTarget?.name}"</span>? This
                                action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteOpen(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm"
                        >
                            Delete Category
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
