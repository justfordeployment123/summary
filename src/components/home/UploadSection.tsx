"use client";

import { Spinner, CheckIcon } from "@/components/home/primitives";
import type { UploadSectionProps } from "@/types/home";

const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];

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
}: UploadSectionProps) {
    const handleFileChange = (selectedFile: File) => {
        if (selectedFile.size > 10 * 1024 * 1024) return;
        if (!ALLOWED_TYPES.includes(selectedFile.type)) return;
        setFile(selectedFile);
    };

    return (
        <section ref={formRef as React.RefObject<HTMLElement>} style={{ padding: "80px 24px", background: "#fff" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* Left — form */}
                    <div style={{ flex: "1 1 400px", minWidth: 300 }}>
                        <div style={{ marginBottom: 36 }}>
                            <span className="feature-chip" style={{ marginBottom: 14, display: "inline-flex" }}>
                                Free Summary
                            </span>
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
                                Your document is encrypted in transit and automatically deleted within 24 hours. We never sell your data.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                                        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
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
                                        First Name <span style={{ color: "#f43f5e" }}>*</span>
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
                                    Send me helpful tips & updates from ExplainMyLetter (optional)
                                </span>
                            </label>

                            {/* Dropzone */}
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
                                    Your Document <span style={{ color: "#f43f5e" }}>*</span>
                                </label>
                                <div
                                    className={`dropzone${isDragging ? " dragging" : ""}${file ? " has-file" : ""}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFileChange(f);
                                        }}
                                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                                        disabled={isUploading}
                                    />
                                    {file ? (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 10,
                                                animation: "fadeIn 0.3s ease",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: "50%",
                                                    background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    animation: "checkPop 0.4s ease",
                                                }}
                                            >
                                                <CheckIcon size={20} />
                                            </div>
                                            <p style={{ fontWeight: 800, color: "#12A1A6", fontSize: "0.9rem" }}>{file.name}</p>
                                            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                                {(file.size / 1024).toFixed(0)} KB — click to change
                                            </p>
                                        </div>
                                    ) : (
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
                                                <svg
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="#12A1A6"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                >
                                                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                            </div>
                                            <p style={{ fontWeight: 700, color: "#475569", fontSize: "0.9rem" }}>Drop your document here</p>
                                            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>PDF, DOCX, JPG, PNG · Max 10 MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            {uploadStatus && (
                                <div className={isError ? "status-error" : "status-info"} style={{ animation: "fadeIn 0.3s ease" }}>
                                    {isError ? (
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            style={{ flexShrink: 0, marginTop: 1 }}
                                        >
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

                            <button type="submit" disabled={isUploading} className="btn-primary" style={{ marginTop: 4 }}>
                                {isUploading ? (
                                    <>
                                        <Spinner size={18} /> Processing…
                                    </>
                                ) : (
                                    <>
                                        Generate Free Summary{" "}
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
                                    Deleted in 24h
                                </span>
                                <span style={{ color: "#e2e8f0" }}>·</span>
                                <span className="trust-item">GDPR Compliant</span>
                            </div>
                        </form>
                    </div>

                    {/* Right — feature sidebar */}
                    <div style={{ flex: "0 0 340px", minWidth: 280 }}>
                        <div
                            style={{
                                padding: "32px",
                                borderRadius: 24,
                                background: "linear-gradient(135deg,#0F233F,#1a3a5c)",
                                position: "sticky",
                                top: 100,
                            }}
                        >
                            <div style={{ marginBottom: 24 }}>
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color: "#54D6D4",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        marginBottom: 10,
                                    }}
                                >
                                    Free Summary Includes
                                </div>
                                <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
                                    Plain-English summary in seconds
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                                {[
                                    "AI reads your letter instantly",
                                    "100-130 word plain-English summary",
                                    "Urgency rating: Routine / Important / Time-Sensitive",
                                    "No sign-up required",
                                    "Works on photos of letters",
                                ].map((f) => (
                                    <div key={f} className="check-item">
                                        <div className="check-icon">
                                            <CheckIcon size={11} />
                                        </div>
                                        <span style={{ color: "rgba(255,255,255,0.8)" }}>{f}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 22 }}>
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color: "#54D6D4",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        marginBottom: 12,
                                    }}
                                >
                                    Full Breakdown Upgrade
                                </div>
                                {[
                                    "Section-by-section structured analysis",
                                    "Actions & deadlines highlighted",
                                    "Legal/technical clause explanations",
                                    "Download as PDF, Word, or Text",
                                ].map((f) => (
                                    <div key={f} className="check-item" style={{ marginBottom: 10 }}>
                                        <div
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: "50%",
                                                background: "rgba(84,214,212,0.2)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <CheckIcon size={11} color="#54D6D4" />
                                        </div>
                                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.83rem" }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
