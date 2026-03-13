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
};
