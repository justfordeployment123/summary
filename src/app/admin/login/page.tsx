"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi"; // Import the API client

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Use the centralized API client
            await adminApi.login(email, password);
            router.push("/admin/dashboard");
            // router.refresh(); // Force layout update
        } catch (err: any) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white">ExplainMyLetter</h1>
                    <p className="text-slate-400 text-sm mt-1">Admin Dashboard</p>
                </div>

                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
                    <h2 className="text-sm font-semibold text-slate-300 mb-6">Sign in to your account</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="admin@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-60 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-60 transition"
                            />
                        </div>

                        {error && <div className="px-4 py-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">{error}</div>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoading ? "Signing in…" : "Sign In"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6">ExplainMyLetter Admin · Authorised access only</p>
            </div>
        </div>
    );
}
