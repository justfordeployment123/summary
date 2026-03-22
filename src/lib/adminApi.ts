// src/lib/adminApi.ts

export interface LoginResponse {
    message: string;
    role: string;
}

export interface AdminUser {
    id: string;
    email: string;
    role: string;
}

export interface StuckJob {
    jobId: string;
    referenceId: string;
    status: string;
    stuckFor: number;
    email: string;
}

export interface RecentJob {
    jobId: string;
    referenceId: string;
    status: string;
    category: string;
    email: string;
    urgency: string;
    createdAt: string;
    amount?: number;
}

export interface DashboardStats {
    totalJobs: number;
    completedToday: number;
    pendingJobs: number;
    failedJobs: number;
    revenueToday: number;
    revenueMonth: number;
    tokenUsageMonth: number;
    tokenCapMonth: number;
    stuckJobs: StuckJob[];
    recentJobs: RecentJob[];
    capWarning: boolean;
}

export interface Category {
    _id: string;
    name: string;
    slug: string;
    base_price: number;
    is_active: boolean;
    createdAt: string;
}

export interface Upsell {
    _id: string;
    name: string;
    description: string;
    is_active: boolean;
    category_prices: Record<string, number>;
    createdAt: string;
}

// ── Prompt types ────────────────────────────────────────────────────────────

export interface Prompt {
    id: string;
    categoryId: string | null;
    categoryName: string;
    type: "free" | "paid" | "upsell";
    promptText: string;
    version: number;
    isActive: boolean;
    updatedAt: string;
}

export interface PromptVersion {
    version: number;
    promptText: string;
    updatedAt: string;
}

export interface CreatePromptPayload {
    categoryId?: string | null;
    type: "free" | "paid" | "upsell";
    promptText: string;
}

export interface UpdatePromptPayload {
    promptText: string;
}

export interface PatchPromptPayload {
    isActive?: boolean;
    type?: "free" | "paid" | "upsell";
}

// ────────────────────────────────────────────────────────────────────────────

export const adminApi = {
    // --- AUTHENTICATION ---

    async login(email: string, password: string): Promise<LoginResponse> {
        const res = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid credentials");
        return data;
    },

    async logout(): Promise<void> {
        const res = await fetch("/api/admin/auth/logout", { method: "POST" });
        if (!res.ok) throw new Error("Failed to logout");
    },

    async getMe(): Promise<{ user: AdminUser }> {
        const res = await fetch("/api/admin/auth/me");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not authenticated");
        return data;
    },

    // --- DASHBOARD & JOBS ---

    async getDashboardStats(): Promise<DashboardStats> {
        const res = await fetch("/api/admin/dashboard");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load dashboard stats");
        return data;
    },

    async getCategories(): Promise<{ categories: Category[] }> {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch categories");
        return data;
    },

    async createCategory(payload: Partial<Category>): Promise<{ category: Category }> {
        const res = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create category");
        return data;
    },

    async updateCategory(id: string, payload: Partial<Category>): Promise<{ category: Category }> {
        const res = await fetch(`/api/admin/categories/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update category");
        return data;
    },

    async deleteCategory(id: string): Promise<{ success: boolean }> {
        const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete category");
        return data;
    },

    async getUpsells(): Promise<{ upsells: Upsell[] }> {
        const res = await fetch("/api/admin/upsells");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch upsells");
        return data;
    },

    async createUpsell(payload: Partial<Upsell>): Promise<{ upsell: Upsell }> {
        const res = await fetch("/api/admin/upsells", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create upsell");
        return data;
    },

    async updateUpsell(id: string, payload: Partial<Upsell>): Promise<{ upsell: Upsell }> {
        const res = await fetch(`/api/admin/upsells/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update upsell");
        return data;
    },

    async deleteUpsell(id: string): Promise<{ success: boolean }> {
        const res = await fetch(`/api/admin/upsells/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete upsell");
        return data;
    },

    // --- SETTINGS ---

    async getSettings(): Promise<{ settings: Record<string, unknown> }> {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch settings");
        return data;
    },

    async updateSetting(key: string, value: unknown): Promise<void> {
        const res = await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update setting");
    },

    // --- JOB DETAILS & ACTIONS ---

    async getJobs(params: URLSearchParams): Promise<unknown> {
        const res = await fetch(`/api/admin/jobs?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
        return data;
    },

    async getJobDetail(jobId: string): Promise<unknown> {
        const res = await fetch(`/api/admin/jobs/${jobId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch job detail");
        return data;
    },

    async regenerateJob(jobId: string): Promise<void> {
        const res = await fetch(`/api/admin/jobs/${jobId}/regenerate`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to regenerate job");
    },

    async refundJob(jobId: string): Promise<void> {
        const res = await fetch(`/api/admin/jobs/${jobId}/refund`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to issue refund");
    },

    // --- PROMPTS ---

    /**
     * GET /api/admin/prompts
     * Fetch all prompt templates, optionally filtered by type or category.
     */
    async getPrompts(filters?: { type?: "free" | "paid" | "upsell"; categoryId?: string }): Promise<{ prompts: Prompt[] }> {
        const params = new URLSearchParams();
        if (filters?.type) params.set("type", filters.type);
        if (filters?.categoryId) params.set("categoryId", filters.categoryId);
        const qs = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(`/api/admin/prompts${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch prompts");
        return data;
    },

    /**
     * GET /api/admin/prompts/[id]
     * Fetch a single prompt by ID.
     */
    async getPrompt(id: string): Promise<{ prompt: Prompt }> {
        const res = await fetch(`/api/admin/prompts/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch prompt");
        return data;
    },

    /**
     * POST /api/admin/prompts
     * Create a new prompt template (starts at version 1).
     */
    async createPrompt(payload: CreatePromptPayload): Promise<{ prompt: Prompt }> {
        const res = await fetch("/api/admin/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create prompt");
        return data;
    },

    /**
     * PUT /api/admin/prompts/[id]
     * Save updated prompt text — snapshots the current version and bumps
     * the version counter. Returns { version, updatedAt }.
     */
    async updatePrompt(id: string, payload: UpdatePromptPayload): Promise<{ version: number; updatedAt: string }> {
        const res = await fetch(`/api/admin/prompts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update prompt");
        return data;
    },

    /**
     * PATCH /api/admin/prompts/[id]
     * Toggle isActive or change type — does NOT bump the version.
     */
    async patchPrompt(id: string, payload: PatchPromptPayload): Promise<Prompt> {
        const res = await fetch(`/api/admin/prompts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to patch prompt");
        return data;
    },

    /**
     * DELETE /api/admin/prompts/[id]
     * Hard-deletes the prompt and all its version history.
     */
    async deletePrompt(id: string): Promise<{ success: boolean }> {
        const res = await fetch(`/api/admin/prompts/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete prompt");
        return data;
    },

    /**
     * GET /api/admin/prompts/[id]/versions
     * Returns the full version timeline for a prompt — current version first,
     * then all archived snapshots in descending order.
     */
    async getPromptVersions(id: string): Promise<{ versions: PromptVersion[] }> {
        const res = await fetch(`/api/admin/prompts/${id}/versions`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch prompt versions");
        return data;
    },
};
