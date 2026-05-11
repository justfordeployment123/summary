"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PrivacyPolicyPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    const checkIcon = (
        <div
            style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(18,161,166,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
            }}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        </div>
    );

    return (
        <div style={{ minHeight: "calc(100vh - 66px)", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .policy-card {
                    padding: 32px 28px;
                    background: #fff;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(15, 35, 63, 0.03);
                    border: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .policy-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(15, 35, 63, 0.08);
                }
            `}</style>

            <div style={{ flex: 1, padding: "60px 24px 80px" }}>
                <div style={{ maxWidth: 860, margin: "0 auto" }}>
                    {/* Page Header */}
                    <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 52, animationDelay: "0ms" }}>
                        <span
                            className="feature-chip"
                            style={{
                                marginBottom: 14,
                                display: "inline-flex",
                                fontSize: "1.1rem",
                                fontWeight: 800,
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
                                letterSpacing: "0.03em",
                                color: "#12A1A6",
                                background: "rgba(18, 161, 166, 0.1)",
                                padding: "8px 18px",
                                borderRadius: "8px",
                                textTransform: "uppercase",
                            }}
                        >
                            Privacy & Security
                        </span>
                        <h1
                            style={{
                                fontSize: "2.8rem",
                                fontWeight: 900,
                                color: "#0F233F",
                                letterSpacing: "-0.02em",
                                marginTop: 10,
                                lineHeight: 1.2,
                            }}
                        >
                            Privacy Policy
                        </h1>
                        <p style={{ fontSize: "1.1rem", color: "#64748b", marginTop: 16, maxWidth: 660, margin: "16px auto 0", lineHeight: 1.6 }}>
                            Your privacy matters to us. Explain My Letter is designed to help you understand important documents clearly, while
                            keeping your personal information protected at every stage.
                        </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* Who We Are */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "100ms" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Who We Are</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                Explain My Letter is a document explanation service that simplifies complex letters and emails into plain English.
                                When you use our website, we may process personal data to deliver this service safely, securely, and effectively.
                            </p>
                        </div>

                        {/* What We Collect */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "150ms" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>What Information We Collect</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>We may collect and process:</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {[
                                    "Documents you upload",
                                    "Basic contact details (if submitted)",
                                    "Technical and usage data (e.g. browser, IP address, session activity)",
                                    "Payment-related information (handled securely by third-party providers)",
                                ].map((item) => (
                                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {checkIcon}
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* How We Use */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "200ms" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>How We Use Your Information</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>We use your information to:</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {[
                                    "Generate summaries and detailed breakdowns of your documents",
                                    "Operate, maintain, and improve the platform",
                                    "Respond to support requests",
                                    "Process payments",
                                    "Meet legal and regulatory obligations",
                                    "Prevent misuse, fraud, or abuse of the service",
                                ].map((item) => (
                                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {checkIcon}
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Legal Basis */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "250ms" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Legal Basis for Processing</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                We process personal data under the following lawful bases:
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {[
                                    { label: "Contract", desc: "to provide the service you request" },
                                    { label: "Legitimate Interests", desc: "to improve, secure, and maintain the platform" },
                                    { label: "Legal Obligation", desc: "where we are required to comply with applicable laws" },
                                ].map(({ label, desc }) => (
                                    <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {checkIcon}
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>
                                            <strong style={{ color: "#0F233F" }}>{label}</strong> — {desc}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* How Documents Are Processed */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "300ms" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>
                                    How Your Documents Are Processed
                                </h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                Your documents are processed using secure systems, including:
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {["Optical Character Recognition (OCR)", "Artificial Intelligence (AI) tools"].map((item) => (
                                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {checkIcon}
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                These systems are used solely to generate clear summaries and explanations of your documents.
                            </p>
                        </div>

                        {/* 3-column grid: Protection, Sharing, Retention */}
                        <div
                            className="animate-fade-up"
                            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 24, animationDelay: "350ms" }}
                        >
                            <div className="policy-card" style={{ gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Data Protection</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                                    We use secure systems and encrypted processing to protect your data. Access is restricted and we follow a data
                                    minimisation approach — only processing what is necessary.
                                </p>
                            </div>

                            <div className="policy-card" style={{ gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Data Sharing</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                                    We do not sell, rent, or trade your personal data. We may use trusted third-party providers (hosting, AI
                                    processing, payment processors) who only handle data on our behalf under appropriate safeguards.
                                </p>
                            </div>

                            <div className="policy-card" style={{ gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Data Retention</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                                    Uploaded documents are automatically deleted after processing and within 24 hours. We do not retain document
                                    content beyond this period unless required for legal, security, or fraud prevention purposes. Limited system logs
                                    may be retained for operational and security reasons.
                                </p>
                            </div>
                        </div>

                        {/* Your Rights */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "400ms" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Your Rights</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>You have the right to:</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {[
                                    "Access your personal data",
                                    "Request correction of inaccurate data",
                                    "Request deletion of your data",
                                    "Restrict or object to processing",
                                    "Lodge a complaint with the Information Commissioner's Office (ICO)",
                                ].map((item) => (
                                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {checkIcon}
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 8, padding: "14px 18px", borderRadius: 12, background: "#f0fdfd", border: "1px solid #b2eeec" }}>
                                <p style={{ fontSize: "0.9rem", color: "#0e6e71", margin: 0, lineHeight: 1.6 }}>
                                    To exercise your rights, contact us at:{" "}
                                    <a href="mailto:info@explainmyletter.co.uk" style={{ color: "#12A1A6", fontWeight: 700, textDecoration: "none" }}>
                                        info@explainmyletter.co.uk
                                    </a>
                                </p>
                            </div>
                            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.6, margin: 0 }}>
                                We are registered with the Information Commissioner's Office (ICO) and committed to protecting your data in line with
                                UK GDPR.
                            </p>
                        </div>

                        {/* Contact */}
                        <div
                            className="policy-card animate-fade-up"
                            style={{ animationDelay: "450ms", background: "linear-gradient(135deg,#f0fdfd,#e6faf9)", borderColor: "#b2eeec" }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        boxShadow: "0 4px 12px rgba(18,161,166,0.15)",
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Contact Us</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#0e4f52", lineHeight: 1.7, margin: 0 }}>
                                If you have any questions about this policy or your data, please contact:{" "}
                                <a href="mailto:info@explainmyletter.co.uk" style={{ color: "#12A1A6", fontWeight: 700, textDecoration: "none" }}>
                                    info@explainmyletter.co.uk
                                </a>
                            </p>
                            <div style={{ marginTop: 8 }}>
                                <Link
                                    href="/contact"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "12px 24px",
                                        borderRadius: 10,
                                        background: "#fff",
                                        color: "#12A1A6",
                                        textDecoration: "none",
                                        fontWeight: 800,
                                        fontSize: "0.9rem",
                                        boxShadow: "0 2px 8px rgba(18,161,166,0.1)",
                                        border: "1px solid #b2eeec",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#12A1A6";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#fff";
                                        e.currentTarget.style.color = "#12A1A6";
                                    }}
                                >
                                    Contact Us →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Banner */}
            <section
                className="hero-mesh animate-fade-up"
                style={{
                    padding: "80px 24px",
                    textAlign: "center",
                    background: "linear-gradient(135deg, #0F233F, #1a3a5c)",
                    animationDelay: "500ms",
                }}
            >
                <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
                    <h2 style={{ fontSize: "2.4rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.15 }}>
                        Got a letter you
                        <br />
                        can&apos;t understand?
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.05rem", marginBottom: 36, lineHeight: 1.6 }}>
                        Upload it now and get a plain-English summary in seconds — free, no account needed.
                    </p>
                    <button
                        onClick={handleRouteToUpload}
                        style={{
                            padding: "15px 32px",
                            borderRadius: 14,
                            background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                            color: "#fff",
                            border: "none",
                            fontFamily: "Raleway,sans-serif",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            boxShadow: "0 6px 24px rgba(18,161,166,0.4)",
                            transition: "all 0.25s ease",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 10px 32px rgba(18,161,166,0.6)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 6px 24px rgba(18,161,166,0.4)";
                        }}
                    >
                        Upload your Letter Free
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </section>
        </div>
    );
}
