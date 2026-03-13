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
    _id: string; // MongoDB uses _id
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
    category_prices: Record<string, number>; // Object mapping Category ID to price
    createdAt: string;
}

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

    async regenerateJob(jobId: string): Promise<{ message: string }> {
        const res = await fetch(`/api/admin/jobs/${jobId}/regenerate`, {
            method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to regenerate job");
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
        const res = await fetch(`/api/admin/categories/${id}`, {
            method: "DELETE",
        });
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
        const res = await fetch(`/api/admin/upsells/${id}`, {
            method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete upsell");
        return data;
    },
};
