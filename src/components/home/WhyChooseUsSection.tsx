"use client";

const highlights = [
    {
        icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
        title: "Secure, Encrypted Processing",
        desc: "Every document is handled through secure, encrypted systems. Your files are never exposed or accessible to unauthorised parties.",
    },
    {
        icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
        title: "Automatic Document Deletion",
        desc: "Uploaded files are automatically deleted within 24 hours of processing. We are built around data minimisation — we keep only what is necessary.",
    },
    {
        icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
        title: "No Advertising or Data Resale",
        desc: "We do not sell, rent, or trade your personal data. We do not use advertising cookies or profile you for third-party marketing.",
    },
    {
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
        title: "UK GDPR-Focused Data Handling",
        desc: "Our data practices are designed around UK GDPR principles. You have rights to access, correct, and request deletion of your data.",
    },
    {
        icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9",
        title: "Built for UK Letters",
        desc: "Designed specifically for UK correspondence — HMRC, NHS, DWP, council letters, courts, landlords, banks and more.",
    },
    {
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
        title: "Instant Results, No Account Needed",
        desc: "Get a plain-English summary in under 30 seconds. No registration, no subscription, no sign-up barriers.",
    },
];

export function WhyChooseUsSection() {
    return (
        <section id="why-choose-us" style={{ padding: "80px 24px", background: "#f8fafc" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 52 }}>
                    <div className="section-divider" />
                      <span className="feature-chip" style={{ 
                        marginBottom: 20, 
                        display: "inline-flex",
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
                        letterSpacing: "0.03em",
                        color: "#12A1A6",
                        background: "rgba(18, 161, 166, 0.1)",
                        padding: "8px 18px",
                        borderRadius: "8px",
                        textTransform: "uppercase"
                    }}>
                        Why Choose Us
                    </span>
                    <h2
                        style={{
                            fontSize: "2.2rem",
                            fontWeight: 900,
                            color: "#0F233F",
                            letterSpacing: "-0.02em",
                            marginTop: 10,
                            lineHeight: 1.2,
                        }}
                    >
                        Clarity-first, privacy-first
                    </h2>
                    <p
                        style={{
                            fontSize: "1rem",
                            color: "#64748b",
                            marginTop: 12,
                            maxWidth: 560,
                            margin: "12px auto 0",
                            lineHeight: 1.6,
                        }}
                    >
                        Explain My Letter is a clarity-first platform built for people who want to understand important documents — without the jargon, confusion, or worry.
                    </p>
                </div>

                {/* Intro banner */}
                <div
                    style={{
                        padding: "32px 40px",
                        borderRadius: 20,
                        background: "linear-gradient(135deg,#0F233F,#1a3a5c)",
                        marginBottom: 40,
                        display: "flex",
                        alignItems: "center",
                        gap: 32,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ flex: 1, minWidth: 240 }}>
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
                            What We Do
                        </div>
                        <p style={{ fontSize: "1.05rem", color: "#fff", fontWeight: 600, lineHeight: 1.65 }}>
                            We transform complex, formal communication into simple, structured explanations — giving you <strong style={{ color: "#54D6D4" }}>clarity, confidence, and control</strong> over what comes next.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {["Secure & Encrypted", "Auto-Deleted in 24hr", "No Data Resale", "UK GDPR Focused"].map((tag) => (
                            <div
                                key={tag}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 100,
                                    background: "rgba(84,214,212,0.15)",
                                    border: "1px solid rgba(84,214,212,0.3)",
                                    color: "#54D6D4",
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.03em",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                ✓ {tag}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
                    {highlights.map((h) => (
                        <div
                            key={h.title}
                            className="how-card"
                            style={{ display: "flex", flexDirection: "column", gap: 14, padding: "28px 24px" }}
                        >
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
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#12A1A6"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d={h.icon} />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0F233F", lineHeight: 1.3 }}>{h.title}</h3>
                            <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.65 }}>{h.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}