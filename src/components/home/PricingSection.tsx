"use client";

interface PricingSectionProps {
    onScrollToUpload: () => void;
}

const pricingTiers = [
    {
        name: "Free Summary",
        price: "£0",
        description: "Get instant clarity on any letter — no commitment, no card required.",
        badge: null,
        highlight: false,
        features: [
            "Plain-English summary (100–130 words)",
            "Urgency rating: Routine / Important / Time-Sensitive",
            "No sign-up required",
            "Works on photos of letters",
            "Processed securely & deleted in 24hr",
        ],
        cta: "Get Free Summary",
        ctaNote: "Always free — no strings attached",
    },
    {
        name: "Full Breakdown",
        price: "From £4.99",
        description: "A deeper, section-by-section analysis with actions, deadlines, and next steps.",
        badge: "Most Popular",
        highlight: true,
        features: [
            "Everything in the Free Summary",
            "Section-by-section structured analysis",
            "Required actions & key deadlines highlighted",
            "Plain-English clause explanations",
            "Possible next steps outlined",
            "Download as PDF, Word, or Text",
        ],
        cta: "Unlock Full Breakdown",
        ctaNote: "Price shown before you pay — no surprises",
    },
];

export function PricingSection({ onScrollToUpload }: PricingSectionProps) {
    return (
        <section id="pricing" style={{ padding: "80px 24px", background: "#fff" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 52 }}>
                    <div className="section-divider" />
                    <span className="feature-chip" style={{ marginBottom: 14, display: "inline-flex" }}>
                        Pricing
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
                        Simple, transparent pricing
                    </h2>
                    <p style={{ fontSize: "1rem", color: "#64748b", marginTop: 12, maxWidth: 500, margin: "12px auto 0", lineHeight: 1.6 }}>
                        Start free. Pay only if you need more detail. You always see the price before confirming.
                    </p>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: 24,
                        alignItems: "start",
                    }}
                >
                    {pricingTiers.map((tier) => (
                        <div
                            key={tier.name}
                            style={{
                                borderRadius: 24,
                                overflow: "hidden",
                                border: tier.highlight ? "2px solid #12A1A6" : "1.5px solid #e2e8f0",
                                background: "#fff",
                                boxShadow: tier.highlight ? "0 8px 40px rgba(18,161,166,0.18)" : "0 2px 16px rgba(15,35,63,0.05)",
                                position: "relative",
                                transition: "transform 0.25s, box-shadow 0.25s",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow = tier.highlight
                                    ? "0 16px 48px rgba(18,161,166,0.25)"
                                    : "0 12px 40px rgba(15,35,63,0.1)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow = tier.highlight
                                    ? "0 8px 40px rgba(18,161,166,0.18)"
                                    : "0 2px 16px rgba(15,35,63,0.05)";
                            }}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    padding: "28px 28px 24px",
                                    background: tier.highlight ? "linear-gradient(135deg,#0F233F,#1a3a5c)" : "#f8fafc",
                                    borderBottom: "1px solid",
                                    borderColor: tier.highlight ? "rgba(84,214,212,0.2)" : "#e2e8f0",
                                    position: "relative",
                                }}
                            >
                                {tier.badge && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 20,
                                            right: 20,
                                            background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                            color: "#fff",
                                            fontSize: "0.7rem",
                                            fontWeight: 800,
                                            padding: "4px 12px",
                                            borderRadius: 100,
                                            letterSpacing: "0.04em",
                                        }}
                                    >
                                        {tier.badge}
                                    </div>
                                )}
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color: tier.highlight ? "#54D6D4" : "#12A1A6",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        marginBottom: 8,
                                    }}
                                >
                                    {tier.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: "2.4rem",
                                        fontWeight: 900,
                                        color: tier.highlight ? "#fff" : "#0F233F",
                                        lineHeight: 1,
                                        marginBottom: 12,
                                    }}
                                >
                                    {tier.price}
                                </div>
                                <p
                                    style={{
                                        fontSize: "0.85rem",
                                        color: tier.highlight ? "rgba(255,255,255,0.65)" : "#64748b",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {tier.description}
                                </p>
                            </div>

                            {/* Features */}
                            <div style={{ padding: "24px 28px 28px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                                    {tier.features.map((f) => (
                                        <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                            <div
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: "50%",
                                                    background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                    marginTop: 1,
                                                }}
                                            >
                                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                                    <path
                                                        d="M3 8l4 4 6-6"
                                                        stroke="#fff"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                            <span style={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.5 }}>{f}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={onScrollToUpload}
                                    className={tier.highlight ? "btn-primary" : ""}
                                    style={
                                        !tier.highlight
                                            ? {
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  gap: 8,
                                                  width: "100%",
                                                  padding: "14px 24px",
                                                  borderRadius: 12,
                                                  border: "1.5px solid #e2e8f0",
                                                  background: "#fff",
                                                  color: "#0F233F",
                                                  fontFamily: "Raleway,sans-serif",
                                                  fontWeight: 800,
                                                  fontSize: "0.95rem",
                                                  cursor: "pointer",
                                                  transition: "all 0.2s",
                                              }
                                            : undefined
                                    }
                                    onMouseEnter={(e) => {
                                        if (!tier.highlight) {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#54D6D4";
                                            (e.currentTarget as HTMLButtonElement).style.color = "#12A1A6";
                                            (e.currentTarget as HTMLButtonElement).style.background = "#f0fdfd";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!tier.highlight) {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
                                            (e.currentTarget as HTMLButtonElement).style.color = "#0F233F";
                                            (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                                        }
                                    }}
                                >
                                    {tier.cta} →
                                </button>
                                <p style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "center", marginTop: 10 }}>{tier.ctaNote}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust note */}
                <div
                    style={{
                        marginTop: 40,
                        padding: "20px 28px",
                        borderRadius: 16,
                        background: "linear-gradient(135deg,#f0fdfd,#e6faf9)",
                        border: "1px solid #b2eeec",
                        textAlign: "center",
                    }}
                >
                    <p style={{ fontSize: "0.85rem", color: "#0e6e71", fontWeight: 600, lineHeight: 1.6 }}>
                        🔒 All payments processed securely by Stripe. Your card details are never stored on our systems. Prices shown include VAT
                        where applicable.
                    </p>
                </div>
            </div>
        </section>
    );
}
