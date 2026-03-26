"use client";

const steps = [
    {
        n: "01",
        title: "Choose Letter Type",
        desc: "Select from Legal, Medical, Government, Financial and more — our system tailors its analysis to your category.",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
    {
        n: "02",
        title: "Upload Your Document",
        desc: "Drag & drop your PDF, DOCX, or photo. We accept JPG and PNG too — even photos of letters work great.",
        icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    },
    {
        n: "03",
        title: "Get Your Free Summary",
        desc: "Our system reads every word and gives you a plain-English summary in seconds, plus an urgency rating.",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
        n: "04",
        title: "Unlock Full Breakdown",
        desc: "Optional paid upgrade gives you a section-by-section analysis with actions, deadlines, and possible next steps.",
        icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    },
];

export function HowItWorksSection() {
    return (
        <section id="how-it-works" style={{ padding: "80px 24px", background: "#f8fafc" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 52 }}>
                    <div className="section-divider" />
                    <span className="feature-chip" style={{ marginBottom: 14, display: "inline-flex" }}>
                        How It Works
                    </span>
                    <h2 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#0F233F", letterSpacing: "-0.02em", marginTop: 10 }}>
                        Four simple steps to clarity
                    </h2>
                    <p style={{ fontSize: "1rem", color: "#64748b", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
                        No jargon. No confusion. Just answers.
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 20 }}>
                    {steps.map((s) => (
                        <div key={s.n} className="how-card anim-fadeUp">
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#54D6D4", letterSpacing: "0.06em" }}>{s.n}</span>
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        background: "linear-gradient(135deg,rgba(18,161,166,0.12),rgba(84,214,212,0.12))",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#12A1A6"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d={s.icon} />
                                    </svg>
                                </div>
                            </div>
                            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F" }}>{s.title}</h3>
                            <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.65 }}>{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
