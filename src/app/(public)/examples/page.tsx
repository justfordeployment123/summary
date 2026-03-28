"use client";

import { useRouter } from "next/navigation";

const examples = [
    {
        type: "Medical / Health",
        badge: "Medical",
        badgeColor: "#0f766e",
        badgeBg: "#ccfbf1",
        before: "We are writing to inform you that your recent test results have now been reviewed by the relevant department. Based on the findings, no immediate concerns have been identified at this stage. However, as part of ongoing monitoring, you are required to attend a follow-up appointment scheduled for 12 May 2026...",
        after: "This letter is from St George’s Hospital NHS Trust confirming that your recent test results have been reviewed. No immediate concerns have been identified, but you are invited to a follow-up appointment on 12 May 2026 for ongoing monitoring. While not urgent, it is important to attend or reschedule to ensure continued care.",
        urgency: "Routine",
        urgencyColor: "#16a34a",
        urgencyBg: "#f0fdf4",
    },
    {
        type: "Money Owed",
        badge: "Utilities",
        badgeColor: "#4338ca",
        badgeBg: "#e0e7ff",
        before: "We are writing regarding your British Gas account, which currently shows an outstanding balance of £482.17. This amount is now overdue. We require payment within 7 days of the date of this letter. Failure to make payment or contact us may result in further action being taken on your account.",
        after: "British Gas is requesting payment of £482.17 for overdue energy bills. You have 7 days to pay or get in touch. This letter indicates the matter is serious; failing to respond may lead to further recovery action. You should review your bill and contact them immediately to discuss payment options and prevent escalation.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
    {
        type: "Court / Legal",
        badge: "Legal",
        badgeColor: "#be123c",
        badgeBg: "#fff1f2",
        before: "You are hereby notified that a claim has been issued against you in the County Court Business Centre for the sum of £1,250. You must respond to this claim within 14 days of service. Failure to respond may result in judgment being entered against you without further notice.",
        after: "The County Court Business Centre has issued a formal legal claim against you for £1,250. You must respond within 14 days. This is a formal legal step, not a warning. If you ignore it, a default judgment may be registered against you, affecting your credit. You should review the claim details and decide on your legal response quickly.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
    {
        type: "Employment",
        badge: "Work",
        badgeColor: "#92400e",
        badgeBg: "#fef3c7",
        before: "We are writing to invite you to attend a disciplinary meeting regarding concerns relating to your attendance. The meeting will take place on 5 April 2026. Please note this forms part of a formal process. You have the right to be accompanied by a colleague or representative.",
        after: "Tesco PLC is inviting you to a formal disciplinary meeting on 5 April 2026 regarding your attendance record. While no final decision has been made, this is a formal HR process. You have the right to bring a colleague or union representative. You should prepare your response to the concerns raised before attending the meeting.",
        urgency: "Important",
        urgencyColor: "#b45309",
        urgencyBg: "#fef3c7",
    },
    {
        type: "Insurance",
        badge: "Finance",
        badgeColor: "#0369a1",
        badgeBg: "#e0f2fe",
        before: "Following our review of your claim, we are pleased to confirm that part of your claim has been approved. A payment of £1,200 will be issued. However, certain elements of your claim have not been accepted as they fall outside the terms and conditions of your policy.",
        after: "Aviva Insurance has partially approved your claim, authorizing a payment of £1,200. However, other parts of your claim were rejected because they aren't covered by your policy terms. You should review the payment details and the reasons for the partial rejection to decide if you want to request further clarification or appeal the decision.",
        urgency: "Important",
        urgencyColor: "#b45309",
        urgencyBg: "#fef3c7",
    },
    {
        type: "Bank / Financial",
        badge: "Finance",
        badgeColor: "#0369a1",
        badgeBg: "#e0f2fe",
        before: "We are writing to inform you that your account has exceeded its agreed overdraft limit by £1,150. You are required to take action within 10 days to bring your account back within the authorised limit. Failure to do so may result in further action being taken.",
        after: "Barclays Bank has notified you that your account is £1,150 over its agreed limit. You have 10 days to bring the balance back within the limit or contact them. This is a formal request to resolve the debt; staying over the limit may lead to fees or further banking restrictions. You should review your balance and take action quickly.",
        urgency: "Important",
        urgencyColor: "#b45309",
        urgencyBg: "#fef3c7",
    },
    {
        type: "HMRC / Tax",
        badge: "Government",
        badgeColor: "#4f46e5",
        badgeBg: "#e0e7ff",
        before: "Our records indicate that you have underpaid tax for the relevant tax year. The outstanding balance of £2,340 is now due. You are required to make payment within 30 days of the date of this notice. Interest or further action may apply if the amount remains unpaid.",
        after: "HMRC states you owe £2,340 in underpaid tax from a previous year. You must pay within 30 days. This is a formal demand for payment rather than a reminder. If unpaid, HMRC may add interest or start collection proceedings. You should verify the calculation and arrange payment or contact them if you disagree with the amount.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
    {
        type: "Housing / Rent",
        badge: "Housing",
        badgeColor: "#701a75",
        badgeBg: "#fdf4ff",
        before: "We are writing to inform you that your rent account is currently in arrears in the sum of £1,800. You are required to make payment or contact us within 14 days. Failure to address this matter may result in further action being taken.",
        after: "Your housing association has identified £1,800 in rent arrears on your account. You have 14 days to pay or discuss the debt with them. This is a serious notification that could lead to formal legal action if ignored. You should check your rent statements and contact your landlord immediately to agree on a payment plan.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
    {
        type: "Utility",
        badge: "Utilities",
        badgeColor: "#4338ca",
        badgeBg: "#e0e7ff",
        before: "Your account currently has an outstanding balance of £265.40. We require payment or contact within 10 days. If we do not hear from you, further action may be taken to recover the amount owed.",
        after: "Thames Water is requesting payment for an outstanding balance of £265.40. You have 10 days to respond or pay. This follows previous reminders and suggests the company may now move toward formal debt recovery. You should check the accuracy of the bill and make payment or call them to avoid further collection steps.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
    {
        type: "School / Education",
        badge: "Education",
        badgeColor: "#c026d3",
        badgeBg: "#fdf4ff",
        before: "We are writing to raise concerns regarding attendance and request that you attend a meeting within 7 days of this letter. This meeting is intended to discuss the situation and agree on next steps.",
        after: "Harris Academy has requested a meeting within 7 days to discuss concerns about a student's attendance record. This is a formal step intended to understand the situation and create an improvement plan. No final decision has been made, but your attendance is required. You should review the attendance data before the meeting.",
        urgency: "Important",
        urgencyColor: "#b45309",
        urgencyBg: "#fef3c7",
    },
    {
        type: "Benefits / DWP",
        badge: "Government",
        badgeColor: "#4f46e5",
        badgeBg: "#e0e7ff",
        before: "Following a review of your Universal Credit claim, we have identified an overpayment of £980. You are required to respond within 14 days. This amount may be recoverable, and further action may be taken if no response is received.",
        after: "The DWP has reviewed your Universal Credit and found you were overpaid by £980. You must respond within 14 days. The DWP typically recovers these funds from future benefits or through other means. You should check your online journal for the breakdown and decide if you need to challenge the decision or arrange repayment.",
        urgency: "Time-Sensitive",
        urgencyColor: "#dc2626",
        urgencyBg: "#fff1f2",
    },
    {
        type: "Contract / Subscription",
        badge: "Services",
        badgeColor: "#2563eb",
        badgeBg: "#eff6ff",
        before: "Following the early termination of your agreement, a charge of £320 has been applied in accordance with the terms of your contract. This amount is now payable. Please refer to your agreement for further details.",
        after: "Vodafone UK has applied an early termination fee of £320 because your contract was cancelled before the end of the minimum term. This charge is now due for payment. You should review your original contract terms to confirm the calculation is correct and then arrange for the payment to clear the account balance.",
        urgency: "Important",
        urgencyColor: "#b45309",
        urgencyBg: "#fef3c7",
    },
];

const URGENCY_STYLES: Record<string, { color: string; bg: string }> = {
    "Time-Sensitive": { color: "#dc2626", bg: "#fff1f2" },
    Important: { color: "#b45309", bg: "#fef3c7" },
    Routine: { color: "#0e6e71", bg: "#f0fdfd" },
};

export default function ExamplesPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ minHeight: "calc(100vh - 66px)", padding: "60px 24px 100px", background: "#f8fafc" }}>
            {/* Custom keyframes and responsive grid styles */}
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .example-grid {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    gap: 0;
                }
                .arrow-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                }
                .arrow-icon {
                    transform: rotate(0deg);
                    transition: transform 0.3s ease;
                }
                @media (max-width: 768px) {
                    .example-grid {
                        grid-template-columns: 1fr;
                    }
                    .arrow-container {
                        padding: 16px 0;
                        z-index: 10;
                    }
                    .arrow-icon {
                        transform: rotate(90deg);
                    }
                }
            `}</style>

            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
                        Examples
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
                        See it in action
                    </h1>
                    <p
                        style={{
                            fontSize: "1.1rem",
                            color: "#64748b",
                            marginTop: 16,
                            maxWidth: 500,
                            margin: "12px auto 0",
                            lineHeight: 1.6,
                        }}
                    >
                        Here's how Explain My Letter transforms confusing official language into clear, plain English.
                    </p>
                </div>

                {/* Examples List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    {examples.map((ex, i) => {
                        const urgencyStyle = URGENCY_STYLES[ex.urgency] || URGENCY_STYLES["Routine"];
                        return (
                            <div
                                key={ex.type}
                                className="glass-card animate-fade-up"
                                style={{
                                    overflow: "hidden",
                                    background: "#fff",
                                    borderRadius: 20,
                                    boxShadow: "0 10px 40px rgba(15, 35, 63, 0.04)",
                                    border: "1px solid #e2e8f0",
                                    animationDelay: `${150 + i * 150}ms`, // Staggers each card by 150ms
                                }}
                            >
                                {/* Card Header */}
                                <div
                                    style={{
                                        padding: "20px 28px",
                                        background: "#f8fafc",
                                        borderBottom: "1px solid #f1f5f9",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 12,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                fontSize: "0.72rem",
                                                fontWeight: 800,
                                                padding: "6px 14px",
                                                borderRadius: 100,
                                                background: ex.badgeBg,
                                                color: ex.badgeColor,
                                                letterSpacing: "0.04em",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            {ex.badge}
                                        </div>
                                        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F233F", margin: 0 }}>{ex.type}</h2>
                                    </div>
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "6px 14px",
                                            borderRadius: 100,
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            border: `1px solid ${urgencyStyle.color}30`,
                                            background: urgencyStyle.bg,
                                            color: urgencyStyle.color,
                                            letterSpacing: "0.03em",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                background: urgencyStyle.color,
                                            }}
                                        />
                                        {ex.urgency}
                                    </div>
                                </div>

                                {/* Before / After Grid */}
                                <div className="example-grid">
                                    {/* Before */}
                                    <div style={{ padding: "32px 28px" }}>
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 800,
                                                color: "#94a3b8",
                                                letterSpacing: "0.06em",
                                                textTransform: "uppercase",
                                                marginBottom: 16,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Original Letter (extract)
                                        </div>
                                        <p
                                            style={{
                                                fontSize: "0.85rem",
                                                color: "#475569",
                                                lineHeight: 1.7,
                                                fontStyle: "italic",
                                                padding: "20px",
                                                background: "#f8fafc",
                                                borderRadius: 14,
                                                border: "1px solid #e2e8f0",
                                                margin: 0,
                                            }}
                                        >
                                            &ldquo;{ex.before}&rdquo;
                                        </p>
                                    </div>

                                    {/* Arrow divider */}
                                    <div className="arrow-container">
                                        <div
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: "50%",
                                                background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                boxShadow: "0 6px 16px rgba(18,161,166,0.25)",
                                            }}
                                        >
                                            <svg
                                                className="arrow-icon"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="#fff"
                                                strokeWidth="3"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* After */}
                                    <div style={{ padding: "32px 28px", background: "linear-gradient(135deg,#f0fdfd,#e6faf9)" }}>
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 800,
                                                color: "#12A1A6",
                                                letterSpacing: "0.06em",
                                                textTransform: "uppercase",
                                                marginBottom: 16,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Plain English Summary
                                        </div>
                                        <p
                                            style={{
                                                fontSize: "0.95rem",
                                                color: "#0e4f52",
                                                lineHeight: 1.7,
                                                fontWeight: 600,
                                                margin: 0,
                                            }}
                                        >
                                            {ex.after}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="animate-fade-up" style={{ textAlign: "center", marginTop: 56, animationDelay: "600ms" }}>
                    <button
                        onClick={handleRouteToUpload}
                        className="btn-primary"
                        style={{
                            maxWidth: 360,
                            margin: "0 auto",
                            padding: "16px 32px",
                            borderRadius: 14,
                            background: "linear-gradient(135deg,#12A1A6,#54D6D4)",
                            color: "#fff",
                            border: "none",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            boxShadow: "0 8px 24px rgba(18,161,166,0.3)",
                            transition: "transform 0.2s, box-shadow 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 12px 28px rgba(18,161,166,0.4)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(18,161,166,0.3)";
                        }}
                    >
                        Try It With Your Letter — Free →
                    </button>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 16, fontWeight: 500 }}>No sign-up needed · Results in seconds</p>
                </div>
            </div>
        </div>
    );
}
