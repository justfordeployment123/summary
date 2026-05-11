"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TermsOfServicePage() {
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
                            Legal & Terms
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
                            Terms of Service
                        </h1>
                        <p style={{ fontSize: "1.1rem", color: "#64748b", marginTop: 16, maxWidth: 660, margin: "16px auto 0", lineHeight: 1.6 }}>
                            These terms explain how Explain My Letter may be used, what you can expect from the service, and your responsibilities
                            when using the platform.
                        </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* About the Service + No Professional Advice */}
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
                                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>About the Service</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                Explain My Letter simplifies and clarifies written correspondence, including letters and emails, using automated
                                systems.
                            </p>
                            <div
                                style={{
                                    padding: "16px",
                                    background: "#fff1f2",
                                    borderRadius: "12px",
                                    border: "1px solid #ffe4e6",
                                    marginTop: "4px",
                                }}
                            >
                                <strong style={{ color: "#be123c", display: "block", marginBottom: "6px", fontSize: "0.95rem" }}>
                                    ⚠️ No Professional Advice
                                </strong>
                                <p style={{ fontSize: "0.9rem", color: "#9f1239", lineHeight: 1.6, margin: 0 }}>
                                    The service is for informational purposes only. Outputs are generated using automated systems and do not replace
                                    professional legal, financial, medical, or other regulated advice.
                                </p>
                            </div>
                        </div>

                        {/* Eligibility, User Responsibility, Upload Responsibility */}
                        <div
                            className="animate-fade-up"
                            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 24, animationDelay: "175ms" }}
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
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Eligibility & Use</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                                    By using the platform, you confirm that:
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {[
                                        "You are authorised to upload the document",
                                        "Your use of the service is lawful",
                                        "You will not misuse or interfere with the platform",
                                    ].map((item) => (
                                        <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                            {checkIcon}
                                            <span style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                        </div>
                                    ))}
                                </div>
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
                                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>User Responsibility</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>You remain responsible for:</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {["How you use the information provided", "Any decisions made based on summaries or breakdowns"].map((item) => (
                                        <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                            {checkIcon}
                                            <span style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                        </div>
                                    ))}
                                </div>
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
                                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Upload Responsibility</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>You confirm that:</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {[
                                        "You have the right to upload and process any document submitted",
                                        "The content does not breach any laws or third-party rights",
                                    ].map((item) => (
                                        <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                            {checkIcon}
                                            <span style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Acceptable Use */}
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
                                        <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Acceptable Use</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                You must <strong>NOT</strong>:
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {[
                                    "Upload unlawful, harmful, or fraudulent material",
                                    "Attempt to disrupt, reverse engineer, or exploit the system",
                                    "Access or use the service beyond its intended purpose",
                                ].map((item) => (
                                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {checkIcon}
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Free Services & Payments */}
                        <div className="policy-card animate-fade-up" style={{ animationDelay: "325ms" }}>
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
                                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Free Services & Payments</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>We may offer:</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                                {["A free summary", "Optional paid services (e.g. full breakdowns)"].map((item) => (
                                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {checkIcon}
                                        <span style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
                                Pricing will always be shown before payment. Paid services are only delivered after successful payment via secure
                                third-party providers.
                            </p>
                        </div>

                        {/* Third-Party Services + Limitation of Liability + Changes */}
                        <div
                            className="animate-fade-up"
                            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 24, animationDelay: "400ms" }}
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
                                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                        <line x1="6" y1="6" x2="6.01" y2="6" />
                                        <line x1="6" y1="18" x2="6.01" y2="18" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Third-Party Services</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                                    We may use trusted third-party services, including AI systems, hosting providers, and payment processors. By using
                                    the service, you agree to this processing where necessary to deliver the service.
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
                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Limitation of Liability</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                                    To the fullest extent permitted by law, Explain My Letter is not liable for decisions made based on outputs,
                                    losses arising from reliance on simplified explanations, or events outside our reasonable control.
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
                                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Changes to the Service</h3>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                                    We may update or modify features, pricing, and these terms. Continued use of the service constitutes acceptance of
                                    any updates.
                                </p>
                            </div>
                        </div>

                        {/* Contact */}
                        <div
                            className="policy-card animate-fade-up"
                            style={{ animationDelay: "475ms", background: "linear-gradient(135deg,#f0fdfd,#e6faf9)", borderColor: "#b2eeec" }}
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
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>Contact</h2>
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#0e4f52", lineHeight: 1.7, margin: 0 }}>
                                For questions about these terms, please contact our support team at{" "}
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
                                <span style={{ marginLeft: 16, fontSize: "0.85rem", color: "#0e6e71", fontWeight: 600 }}>
                                    info@explainmyletter.co.uk
                                </span>
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
                    animationDelay: "550ms",
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
                    <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
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
                                display: "flex",
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
                </div>
            </section>
        </div>
    );
}
