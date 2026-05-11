"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";
import Link from "next/link";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await adminApi.login(email, password);
            router.push("/admin/dashboard");
        } catch (err: any) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .login-wrapper {
                    min-height: 100vh;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    position: relative;
                    overflow: hidden;
                }
                /* Decorative background blobs */
                .login-wrapper::before {
                    content: '';
                    position: absolute;
                    top: -120px;
                    right: -120px;
                    width: 480px;
                    height: 480px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(18,161,166,0.1) 0%, transparent 70%);
                    pointer-events: none;
                }
                .login-wrapper::after {
                    content: '';
                    position: absolute;
                    bottom: -100px;
                    left: -100px;
                    width: 400px;
                    height: 400px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(84,214,212,0.08) 0%, transparent 70%);
                    pointer-events: none;
                }
                .login-card {
                    width: 100%;
                    max-width: 420px;
                    animation: fadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    position: relative;
                    z-index: 1;
                }
                .card-inner {
                    background: #ffffff;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 20px 60px rgba(15, 35, 63, 0.08), 0 4px 16px rgba(15, 35, 63, 0.04);
                    padding: 40px 36px 36px;
                }
                .field-label {
                    display: block;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #64748b;
                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .field-input {
                    width: 100%;
                    padding: 13px 16px;
                    border-radius: 12px;
                    background: #f8fafc;
                    border: 1.5px solid #e2e8f0;
                    color: #0F233F;
                    font-size: 0.9rem;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
                    outline: none;
                    box-sizing: border-box;
                    -webkit-appearance: none;
                }
                .field-input::placeholder { color: #94a3b8; }
                .field-input:focus {
                    border-color: #12A1A6;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(18, 161, 166, 0.12);
                }
                .field-input:disabled { opacity: 0.6; cursor: not-allowed; }
                .password-wrapper {
                    position: relative;
                }
                .password-wrapper .field-input {
                    padding-right: 48px;
                }
                .eye-btn {
                    position: absolute;
                    right: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 6px;
                    transition: color 0.2s, background 0.2s;
                    line-height: 0;
                }
                .eye-btn:hover { color: #12A1A6; background: rgba(18,161,166,0.08); }
                .submit-btn {
                    width: 100%;
                    padding: 14px 24px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #12A1A6, #54D6D4);
                    color: #fff;
                    border: none;
                    font-weight: 800;
                    font-size: 0.95rem;
                    font-family: inherit;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
                    box-shadow: 0 8px 24px rgba(18, 161, 166, 0.3);
                    letter-spacing: 0.01em;
                }
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px rgba(18, 161, 166, 0.4);
                }
                .submit-btn:active:not(:disabled) { transform: translateY(0); }
                .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
                .error-box {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 12px 16px;
                    border-radius: 10px;
                    background: #fff5f5;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    font-size: 0.85rem;
                    font-weight: 500;
                    line-height: 1.5;
                }
                .divider-line {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
                    margin: 28px 0;
                }
                .spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.4);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                    vertical-align: middle;
                    margin-right: 8px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="login-wrapper">
                <div className="login-card">
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                        <Link href="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            <img src="/horizontal-logo.png" alt="ExplainMyLetter" style={{ height: 44, borderRadius: 10 }} />
                        </Link>
                    </div>

                    <div className="card-inner">
                        {/* Card header */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: "linear-gradient(135deg, #12A1A6, #54D6D4)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 4px 12px rgba(18,161,166,0.3)",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#fff"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                </div>
                                <h1
                                    style={{
                                        fontSize: "1.25rem",
                                        fontWeight: 900,
                                        color: "#0F233F",
                                        margin: 0,
                                        letterSpacing: "-0.02em",
                                    }}
                                >
                                    Admin Sign In
                                </h1>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                                Authorised access only. Your session is secure.
                            </p>
                        </div>

                        {/* Teal divider */}
                        <div
                            style={{
                                height: 3,
                                borderRadius: 999,
                                background: "linear-gradient(90deg, #12A1A6, #54D6D4, transparent)",
                                marginBottom: 28,
                            }}
                        />

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {/* Email */}
                            <div>
                                <label className="field-label" htmlFor="admin-email">
                                    Email address
                                </label>
                                <input
                                    id="admin-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    placeholder="admin@example.com"
                                    className="field-input"
                                    autoComplete="email"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="field-label" htmlFor="admin-password">
                                    Password
                                </label>
                                <div className="password-wrapper">
                                    <input
                                        id="admin-password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        className="field-input"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="eye-btn"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            /* Eye-off icon */
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            /* Eye icon */
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="error-box">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        style={{ flexShrink: 0, marginTop: 1 }}
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button type="submit" disabled={isLoading} className="submit-btn" style={{ marginTop: 4 }}>
                                {isLoading ? (
                                    <>
                                        <span className="spinner" />
                                        Signing in…
                                    </>
                                ) : (
                                    "Sign In →"
                                )}
                            </button>
                        </form>

                        <div className="divider-line" />

                        {/* Footer note */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>Secured · Authorised access only</span>
                        </div>
                    </div>

                    {/* Below-card link */}
                    <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500 }}>
                        <Link href="/" style={{ color: "#12A1A6", fontWeight: 700, textDecoration: "none" }}>
                            ← Back to ExplainMyLetter
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
