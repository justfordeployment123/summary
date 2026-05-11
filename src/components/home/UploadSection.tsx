"use client";

import { Spinner, CheckIcon } from "@/components/home/primitives";
import type { UploadSectionProps } from "@/types/home";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState, useEffect } from "react";

const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
const MAX_FILES = 5;

export function UploadSection({
    formRef,
    categories,
    isLoadingCategories,
    isUploading,
    categoryId,
    setCategoryId,
    setSelectedUpsells,
    firstName,
    setFirstName,
    email,
    setEmail,
    marketingConsent,
    setMarketingConsent,
    file,
    setFile,
    isDragging,
    setIsDragging,
    handleDrop,
    uploadStatus,
    isError,
    currentStep,
    handleSubmit,
    turnstileToken,
    setTurnstileToken,
    turnstileResetRef,
    // Multi-file props
    files,
    setFiles,
}: UploadSectionProps & {
    authorisationConsent?: boolean;
    setAuthorisationConsent?: (v: boolean) => void;
    turnstileResetRef?: React.RefObject<(() => void) | null>;
    files?: File[];
    setFiles?: (files: File[]) => void;
}) {
    const [turnstileError, setTurnstileError] = useState(false);
    const turnstileRef = useRef<TurnstileInstance>(undefined);
    const turnstileTokenRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addMoreInputRef = useRef<HTMLInputElement>(null);

    // Use multi-file list if provided, otherwise fall back to single file
    const fileList: File[] = files ?? (file ? [file] : []);
    const setFileList = (newFiles: File[]) => {
        if (setFiles) {
            setFiles(newFiles);
        }
        // Keep single-file prop in sync with first file for backwards compat
        setFile(newFiles[0] ?? null);
    };

    // Expose reset to parent
    useEffect(() => {
        if (turnstileResetRef) {
            turnstileResetRef.current = () => {
                setTurnstileToken(null);
                turnstileRef.current?.reset();
            };
        }
    }, [turnstileResetRef, setTurnstileToken]);

    const validateAndAddFiles = (incoming: FileList | File[]) => {
        const arr = Array.from(incoming);
        const valid = arr.filter((f) => {
            if (f.size > 10 * 1024 * 1024) return false;
            if (!ALLOWED_TYPES.includes(f.type)) return false;
            return true;
        });
        // Deduplicate by name+size
        const existing = new Set(fileList.map((f) => `${f.name}-${f.size}`));
        const deduped = valid.filter((f) => !existing.has(`${f.name}-${f.size}`));
        const combined = [...fileList, ...deduped].slice(0, MAX_FILES);
        setFileList(combined);
    };

    const removeFile = (index: number) => {
        const updated = fileList.filter((_, i) => i !== index);
        setFileList(updated);
    };

    const handleDropZone = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            validateAndAddFiles(e.dataTransfer.files);
        }
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!turnstileTokenRef.current) {
            setTurnstileError(true);
            return;
        }
        setTurnstileError(false);
        handleSubmit(e);
    };

    const comparisonData = [
        { feature: "Identify letter type", free: true, full: true },
        { feature: "Plain English summary", free: true, full: true },
        { feature: "Detailed explanation", free: false, full: true },
        { feature: "Key risks explained", free: false, full: true },
        { feature: "Important dates highlighted", free: false, full: true },
        { feature: "What this typically leads to", free: false, full: true },
        { feature: "Questions to ask", free: false, full: true },
        { feature: "Possible next steps", free: false, full: true },
    ];

    const getFileIcon = (type: string) => {
        if (type === "application/pdf") return "PDF";
        if (type.includes("wordprocessing")) return "DOC";
        if (type.startsWith("image/")) return "IMG";
        return "FILE";
    };

    const getFileIconColor = (type: string) => {
        if (type === "application/pdf") return { bg: "rgba(239,68,68,0.12)", color: "#ef4444" };
        if (type.includes("wordprocessing")) return { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" };
        if (type.startsWith("image/")) return { bg: "rgba(16,185,129,0.12)", color: "#10b981" };
        return { bg: "rgba(99,102,241,0.12)", color: "#6366f1" };
    };

    return (
        <>
            <style>{`
                @media (max-width: 768px) {
                    .upload-outer-row {
                        flex-direction: column !important;
                        gap: 32px !important;
                    }
                    .upload-form-col {
                        flex: 1 1 100% !important;
                        min-width: unset !important;
                        width: 100% !important;
                    }
                    .upload-table-col {
                        flex: 1 1 100% !important;
                        min-width: unset !important;
                        width: 100% !important;
                    }
                    .upload-table-col > div {
                        position: static !important;
                    }
                    .two-col {
                        flex-direction: column !important;
                    }
                }
                .file-item-remove {
                    opacity: 0;
                    transition: opacity 0.15s ease;
                }
                .file-item-row:hover .file-item-remove {
                    opacity: 1;
                }
                .add-more-btn {
                    transition: background 0.15s ease, border-color 0.15s ease;
                }
                .add-more-btn:hover {
                    background: rgba(18,161,166,0.08) !important;
                    border-color: #12A1A6 !important;
                }
                .add-more-btn:hover span {
                    color: #12A1A6 !important;
                }
            `}</style>

            <section id="upload" ref={formRef as React.RefObject<HTMLElement>} style={{ padding: "80px 24px", background: "#fff" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div className="upload-outer-row" style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
                        {/* Left — form */}
                        <div className="upload-form-col" style={{ flex: "1 1 400px", minWidth: 300 }}>
                            <div style={{ marginBottom: 36 }}>
                                <img src="/safe-encrypted.png" width="150" alt="" />
                                <h2
                                    style={{
                                        fontSize: "2rem",
                                        fontWeight: 900,
                                        color: "#0F233F",
                                        letterSpacing: "-0.02em",
                                        marginTop: 10,
                                        lineHeight: 1.15,
                                    }}
                                >
                                    Upload your letter
                                </h2>
                                <p style={{ color: "#64748b", marginTop: 10, fontSize: "0.95rem", lineHeight: 1.6 }}>
                                    Your letter is encrypted in transit and automatically deleted within 24 hours. We never sell your data. Your letter and any personal details remain completely private, encrypted, and secure at all times. No human will view or read your letter, it is processed securely by our automated system ONLY, following UK ICO data protection guidelines
                                </p>
                            </div>

                            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                {/* Category */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 800,
                                            color: "#0F233F",
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Letter Type <span style={{ color: "#f43f5e" }}>*</span>
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => {
                                                setCategoryId(e.target.value);
                                                setSelectedUpsells([]);
                                            }}
                                            required
                                            disabled={isUploading || isLoadingCategories}
                                            style={{ paddingRight: 40, fontWeight: 600 }}
                                        >
                                            <option value="" disabled>
                                                {isLoadingCategories ? "Loading…" : "Select a category…"}
                                            </option>
                                            {categories.map((c) => (
                                                <option key={c._id} value={c._id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        <svg
                                            style={{
                                                position: "absolute",
                                                right: 14,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                pointerEvents: "none",
                                            }}
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#94a3b8"
                                            strokeWidth="2"
                                        >
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </div>
                                    <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 6, padding: "0 10px" }}>
                                        Please choose the correct category for your letter, as the wrong selection could lead to an incorrect summary.
                                    </p>
                                </div>

                                {/* Name + Email */}
                                <div className="two-col" style={{ display: "flex", gap: 14 }}>
                                    <div style={{ flex: 1 }}>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "0.8rem",
                                                fontWeight: 800,
                                                color: "#0F233F",
                                                letterSpacing: "0.04em",
                                                textTransform: "uppercase",
                                                marginBottom: 8,
                                            }}
                                        >
                                            Full Name <span style={{ color: "#f43f5e" }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Sarah"
                                            required
                                            minLength={2}
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "0.8rem",
                                                fontWeight: 800,
                                                color: "#0F233F",
                                                letterSpacing: "0.04em",
                                                textTransform: "uppercase",
                                                marginBottom: 8,
                                            }}
                                        >
                                            Email <span style={{ color: "#f43f5e" }}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>

                                {/* Marketing consent */}
                                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={marketingConsent}
                                        onChange={(e) => setMarketingConsent(e.target.checked)}
                                        disabled={isUploading}
                                    />
                                    <span style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5, paddingTop: 1 }}>
                                        Send me helpful tips, updates &amp; discounts from ExplainMyLetter (optional)
                                    </span>
                                </label>

                                {/* Authorisation consent — required */}
                                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                                    <input type="checkbox" required disabled={isUploading} />
                                    <span style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5, paddingTop: 1 }}>
                                        <span style={{ color: "#0F233F", fontWeight: 700 }}>
                                            <span style={{ color: "#f43f5e", fontWeight: 700 }}>* </span>I confirm I am authorised to upload this
                                            document
                                        </span>{" "}
                                        and understand that Explain My Letter provides simplified explanations, <strong>NOT</strong> legal, medical,
                                        financial or professional advice.
                                    </span>
                                </label>

                                {/* ── Multi-file Dropzone ── */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 800,
                                            color: "#0F233F",
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Your Document{fileList.length !== 1 ? "s" : ""} <span style={{ color: "#f43f5e" }}>*</span>
                                        {fileList.length > 0 && (
                                            <span
                                                style={{
                                                    marginLeft: 8,
                                                    fontSize: "0.72rem",
                                                    fontWeight: 600,
                                                    color: "#94a3b8",
                                                    textTransform: "none",
                                                    letterSpacing: 0,
                                                }}
                                            >
                                                {fileList.length}/{MAX_FILES} files
                                            </span>
                                        )}
                                    </label>

                                    {/* Existing files list */}
                                    {fileList.length > 0 && (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 8,
                                                marginBottom: 10,
                                            }}
                                        >
                                            {fileList.map((f, i) => {
                                                const iconStyle = getFileIconColor(f.type);
                                                return (
                                                    <div
                                                        key={`${f.name}-${f.size}`}
                                                        className="file-item-row"
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 12,
                                                            padding: "10px 14px",
                                                            borderRadius: 12,
                                                            background: "#f8fafc",
                                                            border: "1.5px solid #e2e8f0",
                                                            animation: "fadeIn 0.25s ease",
                                                        }}
                                                    >
                                                        {/* Page indicator */}
                                                        <div
                                                            style={{
                                                                flexShrink: 0,
                                                                width: 22,
                                                                height: 22,
                                                                borderRadius: "50%",
                                                                background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                fontSize: "0.65rem",
                                                                fontWeight: 800,
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            {i + 1}
                                                        </div>

                                                        {/* File type badge */}
                                                        <div
                                                            style={{
                                                                flexShrink: 0,
                                                                padding: "2px 7px",
                                                                borderRadius: 6,
                                                                background: iconStyle.bg,
                                                                fontSize: "0.62rem",
                                                                fontWeight: 800,
                                                                color: iconStyle.color,
                                                                letterSpacing: "0.05em",
                                                            }}
                                                        >
                                                            {getFileIcon(f.type)}
                                                        </div>

                                                        {/* File name */}
                                                        <span
                                                            style={{
                                                                flex: 1,
                                                                fontSize: "0.82rem",
                                                                fontWeight: 600,
                                                                color: "#334155",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {f.name}
                                                        </span>

                                                        {/* File size */}
                                                        <span
                                                            style={{
                                                                flexShrink: 0,
                                                                fontSize: "0.72rem",
                                                                color: "#94a3b8",
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {(f.size / 1024).toFixed(0)} KB
                                                        </span>

                                                        {/* Remove button */}
                                                        {!isUploading && (
                                                            <button
                                                                type="button"
                                                                className="file-item-remove"
                                                                onClick={() => removeFile(i)}
                                                                style={{
                                                                    flexShrink: 0,
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: "50%",
                                                                    background: "rgba(244,63,94,0.1)",
                                                                    border: "none",
                                                                    cursor: "pointer",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    padding: 0,
                                                                }}
                                                                title="Remove file"
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="3">
                                                                    <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Drop zone — shown when no files yet, or as add-more area */}
                                    {fileList.length === 0 ? (
                                        /* Primary dropzone */
                                        <div
                                            className={`dropzone${isDragging ? " dragging" : ""}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleDropZone}
                                            style={{ position: "relative" }}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                onChange={(e) => { if (e.target.files?.length) validateAndAddFiles(e.target.files); }}
                                                accept=".pdf,.docx,.jpg,.jpeg,.png"
                                                disabled={isUploading}
                                            />
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                                <div
                                                    style={{
                                                        width: 52,
                                                        height: 52,
                                                        borderRadius: 16,
                                                        background: "linear-gradient(135deg,rgba(18,161,166,0.1),rgba(84,214,212,0.1))",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="1.8" strokeLinecap="round">
                                                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                </div>
                                                <p style={{ fontWeight: 700, color: "#475569", fontSize: "0.9rem" }}>Drop your document(s) here</p>
                                                <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>PDF, DOCX, JPG, PNG · Max 10 MB each · Up to {MAX_FILES} files</p>
                                            </div>
                                        </div>
                                    ) : fileList.length < MAX_FILES && !isUploading ? (
                                        /* Add more button — shown after at least one file is added */
                                        <div
                                            className={`add-more-btn${isDragging ? " dragging" : ""}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleDropZone}
                                            style={{
                                                position: "relative",
                                                borderRadius: 12,
                                                border: `2px dashed ${isDragging ? "#12A1A6" : "#cbd5e1"}`,
                                                padding: "14px 20px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                cursor: "pointer",
                                                background: isDragging ? "rgba(18,161,166,0.04)" : "transparent",
                                            }}
                                            onClick={() => addMoreInputRef.current?.click()}
                                        >
                                            <input
                                                ref={addMoreInputRef}
                                                type="file"
                                                multiple
                                                onChange={(e) => { if (e.target.files?.length) validateAndAddFiles(e.target.files); }}
                                                accept=".pdf,.docx,.jpg,.jpeg,.png"
                                                disabled={isUploading}
                                                style={{ display: "none" }}
                                            />
                                            {/* Plus icon */}
                                            <div
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: "50%",
                                                    border: "2px solid #cbd5e1",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                    background: "#fff",
                                                }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                                                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Add another page or document</span>
                                                <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", marginTop: 1 }}>
                                                    {MAX_FILES - fileList.length} slot{MAX_FILES - fileList.length !== 1 ? "s" : ""} remaining · drag &amp; drop or click
                                                </span>
                                            </div>
                                        </div>
                                    ) : fileList.length >= MAX_FILES ? (
                                        <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", margin: 0, padding: "8px 0" }}>
                                            Maximum {MAX_FILES} files reached. Remove a file to add another.
                                        </p>
                                    ) : null}

                                    {/* Helper text */}
                                    {fileList.length > 1 && (
                                        <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="2.5" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Files will be processed in order and combined into a single analysis.
                                        </p>
                                    )}
                                </div>

                                {/* Turnstile CAPTCHA */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", alignItems: "center" }}>
                                    <Turnstile
                                        ref={turnstileRef}
                                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                        onSuccess={(token) => {
                                            turnstileTokenRef.current = token;
                                            setTurnstileToken(token);
                                            setTurnstileError(false);
                                        }}
                                        onExpire={() => {
                                            turnstileTokenRef.current = null;
                                            setTurnstileToken(null);
                                            turnstileRef.current?.reset();
                                        }}
                                        onError={() => {
                                            turnstileTokenRef.current = null;
                                            setTurnstileToken(null);
                                            setTurnstileError(true);
                                        }}
                                        options={{ theme: "light" }}
                                    />
                                    {turnstileError && (
                                        <p style={{ fontSize: "0.8rem", color: "#f43f5e", margin: 0 }}>
                                            Please complete the security check before submitting.
                                        </p>
                                    )}
                                </div>

                                {/* Status */}
                                {uploadStatus && (
                                    <div className={isError ? "status-error" : "status-info"} style={{ animation: "fadeIn 0.3s ease" }}>
                                        {isError ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M12 8v4m0 4h.01" />
                                            </svg>
                                        ) : (
                                            <Spinner size={16} />
                                        )}
                                        <span>{uploadStatus}</span>
                                    </div>
                                )}

                                {/* Progress */}
                                {isUploading && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div className="progress-track">
                                            <div className="progress-fill" style={{ width: `${(currentStep / 4) * 100}%` }} />
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Processing…</span>
                                            <span style={{ fontSize: "0.75rem", color: "#12A1A6", fontWeight: 700 }}>Step {currentStep + 1} / 5</span>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={isUploading || fileList.length === 0} className="btn-primary" style={{ marginTop: 4 }}>
                                    {isUploading ? (
                                        <>
                                            <Spinner size={18} /> Processing…
                                        </>
                                    ) : (
                                        <>
                                            Generate Your FREE Summary First - No Commitment{" "}
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </button>

                                <div className="trust-row" style={{ marginTop: 4 }}>
                                    <span className="trust-item">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>{" "}
                                        Encrypted
                                    </span>
                                    <span style={{ color: "#e2e8f0" }}>·</span>
                                    <span className="trust-item">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                            <polyline points="17 6 23 6 23 12" />
                                        </svg>{" "}
                                        Deleted Within 24hr
                                    </span>
                                    <span style={{ color: "#e2e8f0" }}>·</span>
                                    <span className="trust-item">GDPR Compliant</span>
                                    <span style={{ color: "#e2e8f0" }}>·</span>
                                    <span className="trust-item">Built for UK Letters</span>
                                </div>
                            </form>
                        </div>

                        {/* Right — comparison table */}
                        <div className="upload-table-col" style={{ flex: "0 0 380px", minWidth: 320 }}>
                            <div
                                style={{
                                    padding: "32px 24px",
                                    borderRadius: 24,
                                    background: "linear-gradient(135deg,#0F233F,#1a3a5c)",
                                    position: "sticky",
                                    top: 100,
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: "1.25rem",
                                        fontWeight: 900,
                                        color: "#fff",
                                        textAlign: "center",
                                        marginBottom: 24,
                                        letterSpacing: "-0.01em",
                                    }}
                                >
                                    Free Summary vs Full Breakdown
                                </h3>

                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: "left", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}></th>
                                            <th style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#54D6D4", fontWeight: 800, textAlign: "center", width: "25%" }}>
                                                Free
                                            </th>
                                            <th style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#54D6D4", fontWeight: 800, textAlign: "center", width: "25%" }}>
                                                Full (Paid)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonData.map((row, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                                                    {row.feature}
                                                </td>
                                                <td style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", verticalAlign: "middle" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                        {row.free && <CheckIcon size={16} color="#54D6D4" />}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", verticalAlign: "middle" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                        {row.full && <CheckIcon size={16} color="#54D6D4" />}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}