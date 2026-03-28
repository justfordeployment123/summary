"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BreakdownSection {
    heading: string;
    body: string;
    bullets?: string[];
}

interface Example {
    type: string;
    badge: string;
    badgeColor: string;
    badgeBg: string;
    before: string;
    after: string;
    urgency: string;
    urgencyColor: string;
    urgencyBg: string;
    breakdown: {
        urgencyLabel: string;
        urgencyColor: string;
        intro: string;
        sections: BreakdownSection[];
        keyChecks: string[];
    };
}

// ─── Data ────────────────────────────────────────────────────────────────────

const examples: Example[] = [
    {
        type: "Medical / Health",
        badge: "Medical",
        badgeColor: "#0f766e",
        badgeBg: "#ccfbf1",
        before: "We are writing to inform you that your recent test results have now been reviewed by the relevant department. Based on the findings, no immediate concerns have been identified at this stage. However, as part of ongoing monitoring, you are required to attend a follow-up appointment scheduled for 12 May 2026...",
        after: "This letter is from St George's Hospital NHS Trust confirming that your recent test results have been reviewed. No immediate concerns have been identified, but you are invited to a follow-up appointment on 12 May 2026 for ongoing monitoring. While not urgent, it is important to attend or reschedule to ensure continued care.",
        urgency: "Routine",
        urgencyColor: "#16a34a",
        urgencyBg: "#f0fdf4",
        breakdown: {
            urgencyLabel: "Routine",
            urgencyColor: "#16a34a",
            intro: "This letter is a routine follow-up from St George's Hospital NHS Trust, confirming that your recent test results have been reviewed and that no immediate concerns have been identified. The wording suggests this is not an emergency, but part of an ongoing process of monitoring your health. The appointment date is 12 May 2026.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "The letter is reassuring rather than alarming. It is not saying that urgent treatment is needed. This type of letter is commonly used when:",
                    bullets: [
                        "Routine monitoring is needed",
                        "Results were reviewed without major concern",
                        "A follow-up appointment is part of ongoing care",
                    ],
                },
                {
                    heading: "Understanding your position",
                    body: "See this letter as part of a wider care process rather than a warning. You are not being asked to make a difficult decision straight away, but you are expected to stay engaged. You may want to:",
                    bullets: ["Attend the appointment as arranged", "Rearrange if the date is not suitable", "Prepare questions about your results"],
                },
                {
                    heading: "If you cannot attend the appointment",
                    body: "Do not simply miss it. Contact the hospital department as soon as possible and ask to rearrange. Keep a note of the new date once confirmed. This helps avoid delays in your care.",
                },
            ],
            keyChecks: ["Appointment date: 12 May 2026", "Hospital department or consultant name", "Any preparation instructions included"],
        },
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
        breakdown: {
            urgencyLabel: "Time-Sensitive",
            urgencyColor: "#dc2626",
            intro: "This letter is a payment request from British Gas indicating your account has fallen into arrears. The amount is £482.17 with a 7-day deadline — signalling early escalation beyond a standard reminder.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "The situation is still manageable. If the balance remains unpaid, the account may progress to:",
                    bullets: [
                        "Additional charges being added",
                        "Referral to a debt collection process",
                        "More formal escalation in future communications",
                    ],
                },
                {
                    heading: "Understanding your position",
                    body: "You are not limited to paying immediately. Companies often expect contact and engagement at this stage. You may choose to:",
                    bullets: [
                        "Pay the full amount to resolve the issue",
                        "Contact British Gas to arrange a repayment plan",
                        "Check the bill carefully if something seems wrong",
                    ],
                },
                {
                    heading: "If you're unable to pay right now",
                    body: "Contact British Gas as soon as possible, explain your situation clearly, and ask about repayment options or support arrangements. This shows willingness to resolve the issue and may prevent further escalation.",
                },
            ],
            keyChecks: ["Total amount owed: £482.17", "Deadline for action: 7 days", "Whether any charges appear incorrect"],
        },
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
        breakdown: {
            urgencyLabel: "Time-Sensitive",
            urgencyColor: "#dc2626",
            intro: "This is a formal court notice from the County Court Business Centre. A claim of £1,250 has been issued against you. This means the matter has already moved into the legal process — the 14-day response deadline is critical.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "The claim is active. If ignored, the matter may progress to:",
                    bullets: [
                        "A default judgment being entered against you",
                        "Loss of the opportunity to challenge the claim",
                        "Further enforcement action at a later stage",
                    ],
                },
                {
                    heading: "Understanding your position",
                    body: "Receiving a court claim does not mean you have lost. You still have options — but the deadline matters and action is needed. You may:",
                    bullets: [
                        "Accept the claim and deal with the payment",
                        "Dispute the claim if you believe it is wrong",
                        "Partially admit the claim and respond accordingly",
                    ],
                },
                {
                    heading: "If you're unsure how to deal with it",
                    body: "Read the claim form carefully from start to finish. Gather any related documents or previous correspondence. Consider seeking legal clarification before the deadline expires. You can access free legal advice through Citizens Advice.",
                },
            ],
            keyChecks: ["Amount being claimed: £1,250", "Response deadline: 14 days", "Whether the claim details are accurate"],
        },
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
        breakdown: {
            urgencyLabel: "Important",
            urgencyColor: "#b45309",
            intro: "This letter from Tesco PLC relates to a disciplinary meeting concerning your attendance. It is a formal stage where your explanation will be heard before any decision is made. The meeting is on 5 April 2026 and you may bring a representative.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "No decision has been made yet. This meeting could lead to:",
                    bullets: ["A formal warning", "Further monitoring of your attendance", "Additional disciplinary action if concerns continue"],
                },
                {
                    heading: "Understanding your position",
                    body: "This is your opportunity to explain your side. Your response matters. You may choose to:",
                    bullets: [
                        "Attend and explain your circumstances",
                        "Bring a colleague or union representative",
                        "Prepare supporting information beforehand",
                    ],
                },
                {
                    heading: "How to prepare",
                    body: "Review your attendance history and make notes about any relevant circumstances — medical, personal, or otherwise. Bring any evidence that supports your explanation. If anything seems inaccurate in the letter, raise it clearly and calmly at the meeting.",
                },
            ],
            keyChecks: ["Meeting date: 5 April 2026", "Your right to bring a representative", "Whether the concerns described are accurate"],
        },
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
        breakdown: {
            urgencyLabel: "Important",
            urgencyColor: "#b45309",
            intro: "Aviva Insurance has partially approved your claim and will pay £1,200. Some items were declined because they fall outside policy terms. This does not mean the matter is closed.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "Aviva accepts some responsibility, but limits the payout via policy terms. If you're unhappy with the decision, it may progress to:",
                    bullets: [
                        "A request for further explanation from the insurer",
                        "An internal review or complaint",
                        "A formal dispute if the issue remains unresolved",
                    ],
                },
                {
                    heading: "Understanding your position",
                    body: "You do not have to accept the wording at face value. You may choose to:",
                    bullets: [
                        "Accept the £1,200 payment as offered",
                        "Ask Aviva for a clearer explanation of the exclusions",
                        "Review the policy wording to check how the decision was reached",
                    ],
                },
                {
                    heading: "If you want to challenge the outcome",
                    body: "Ask Aviva to explain the exclusions in plain terms. Compare the decision against your policy wording. Provide any extra evidence that may support your claim. This puts you in a better position to decide whether to request a review.",
                },
            ],
            keyChecks: ["Approved payment amount: £1,200", "Which items or losses were declined", "Policy exclusions being relied upon"],
        },
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
        breakdown: {
            urgencyLabel: "Important",
            urgencyColor: "#b45309",
            intro: "Barclays Bank has informed you that your account is £1,150 over its agreed overdraft limit. You have 10 days to bring it back within range. This is not yet formal enforcement, but it is moving that way.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "If the balance remains outside agreed limits, the situation may progress to:",
                    bullets: [
                        "Additional charges or fees being applied",
                        "Restrictions being placed on your account",
                        "Referral to collections or recovery processes",
                    ],
                },
                {
                    heading: "Understanding your position",
                    body: "You still have options. Banks often expect contact and discussion before escalating. You may choose to:",
                    bullets: [
                        "Deposit funds to bring the balance within limits",
                        "Contact Barclays to discuss a temporary extension",
                        "Speak to the bank about financial support options",
                    ],
                },
                {
                    heading: "If you're experiencing financial difficulty",
                    body: "Contact Barclays as soon as possible. Explain your financial situation and ask about support options or temporary arrangements. Early communication usually leads to better outcomes and can prevent further escalation.",
                },
            ],
            keyChecks: ["Amount over limit: £1,150", "Timeframe given: 10 days", "Any charges or fees already applied"],
        },
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
        breakdown: {
            urgencyLabel: "Time-Sensitive",
            urgencyColor: "#dc2626",
            intro: "HMRC states you have underpaid tax and owe £2,340, due within 30 days. This is a formal demand — the matter has already been reviewed and calculated. It is not yet enforcement, but it should be taken seriously.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "If not addressed, the situation may progress to:",
                    bullets: ["Interest being added to the amount owed", "Penalties for non-payment", "More formal enforcement measures by HMRC"],
                },
                {
                    heading: "Understanding your position",
                    body: "You have options beyond simply paying immediately. You may choose to:",
                    bullets: [
                        "Pay the amount in full",
                        "Contact HMRC to arrange a payment plan",
                        "Review the calculation if you believe it is incorrect",
                    ],
                },
                {
                    heading: "If you're unable to pay",
                    body: "HMRC often allows structured arrangements if you engage early. Contact HMRC as soon as possible, explain your situation, and ask about a Time to Pay arrangement. This can spread the cost and avoid further escalation.",
                },
            ],
            keyChecks: ["Amount owed: £2,340", "Deadline: 30 days", "Tax year and calculation details"],
        },
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
        breakdown: {
            urgencyLabel: "Time-Sensitive",
            urgencyColor: "#dc2626",
            intro: "Your housing association has identified £1,800 in rent arrears and is expecting action within 14 days. This is moving beyond a simple reminder and into a formal stage of the process.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "If arrears are not addressed, the situation may progress to:",
                    bullets: ["Formal legal proceedings", "Possibility of eviction action", "Further escalation of the tenancy issue"],
                },
                {
                    heading: "Understanding your position",
                    body: "Landlords often expect communication and are willing to agree arrangements. You may choose to:",
                    bullets: [
                        "Pay some or all of the arrears",
                        "Contact the landlord to arrange a repayment plan",
                        "Seek independent housing advice or support",
                    ],
                },
                {
                    heading: "If you're unable to pay",
                    body: "Contact the housing association immediately, explain your situation, and request a repayment arrangement. Early engagement demonstrates willingness to resolve the issue and can prevent further escalation.",
                },
            ],
            keyChecks: ["Arrears amount: £1,800", "Timeframe: 14 days", "Any references to legal action in the letter"],
        },
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
        breakdown: {
            urgencyLabel: "Time-Sensitive",
            urgencyColor: "#dc2626",
            intro: "Thames Water is requesting payment of £265.40 within 10 days. This is a billing escalation letter — the account is no longer being treated as a routine overdue balance.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "If the issue is not resolved, it may progress to:",
                    bullets: ["Further reminders or formal escalation", "Additional charges being applied", "Possible involvement of debt recovery"],
                },
                {
                    heading: "Understanding your position",
                    body: "Service providers are usually expecting engagement rather than immediate escalation. You may choose to:",
                    bullets: ["Pay the balance in full", "Arrange a payment plan", "Check the bill for accuracy before paying"],
                },
                {
                    heading: "If you're unable to pay",
                    body: "Contact Thames Water, explain your situation, and ask about payment arrangements. Many providers have support schemes for customers in financial difficulty. Keep a record of all communication.",
                },
            ],
            keyChecks: ["Amount owed: £265.40", "Deadline: 10 days", "Any unusual charges on the bill"],
        },
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
        breakdown: {
            urgencyLabel: "Important",
            urgencyColor: "#b45309",
            intro: "Harris Academy is formally raising concerns about attendance and requesting a meeting within 7 days. This is an early-stage intervention — the school wants a discussion before taking any further steps.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "If the situation continues, it may lead to:",
                    bullets: [
                        "Ongoing formal monitoring",
                        "Further meetings or escalation",
                        "Involvement of other parties such as the local authority",
                    ],
                },
                {
                    heading: "Understanding your position",
                    body: "You have the opportunity to explain the situation and provide context before any further action is considered. You may choose to:",
                    bullets: [
                        "Attend the meeting and explain the circumstances",
                        "Provide any supporting evidence",
                        "Bring any records of valid absences",
                    ],
                },
                {
                    heading: "How to prepare",
                    body: "Review attendance records and note any absences that had valid reasons — medical, personal, or otherwise. If anything in the letter appears inaccurate, raise it calmly during the meeting. Going prepared makes a positive impression.",
                },
            ],
            keyChecks: ["Meeting timeframe: 7 days", "Reason for the concern", "Whether any specific dates or incidents are referenced"],
        },
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
        breakdown: {
            urgencyLabel: "Time-Sensitive",
            urgencyColor: "#dc2626",
            intro: "The DWP has identified an overpayment of £980 on your Universal Credit claim and requires a response within 14 days. This is a formal communication, not a routine update.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "If not addressed, the DWP may proceed with:",
                    bullets: ["Deductions from future benefit payments", "Requests for repayment arrangements", "Further recovery action"],
                },
                {
                    heading: "Understanding your position",
                    body: "You are not limited to accepting the decision. Many people assume benefit decisions can't be challenged — they often can. You may choose to:",
                    bullets: [
                        "Accept the overpayment and arrange repayment",
                        "Review the decision if you believe it is incorrect",
                        "Contact the DWP for a full breakdown and explanation",
                    ],
                },
                {
                    heading: "If you're unable to repay",
                    body: "Contact the DWP as soon as possible. Explain your financial situation and ask about repayment arrangements or deductions from benefits. Early engagement usually leads to a more manageable outcome.",
                },
            ],
            keyChecks: ["Amount owed: £980", "Deadline: 14 days", "Reason given for the overpayment"],
        },
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
        breakdown: {
            urgencyLabel: "Important",
            urgencyColor: "#b45309",
            intro: "Vodafone UK has applied a £320 early termination fee following the cancellation of your contract before the minimum term ended. This is not a penalty for wrongdoing, but a contractual charge.",
            sections: [
                {
                    heading: "What this means in practice",
                    body: "If the balance is not addressed, it may progress to:",
                    bullets: ["Further billing notices or reminders", "Account escalation within Vodafone", "Possible referral to debt recovery"],
                },
                {
                    heading: "Understanding your position",
                    body: "It is reasonable to check whether the charge has been applied correctly. You may choose to:",
                    bullets: [
                        "Pay the amount as requested",
                        "Ask Vodafone to explain how the figure was calculated",
                        "Review your original contract terms before paying",
                    ],
                },
                {
                    heading: "If the charge doesn't look right",
                    body: "Check the length of the original contract, the remaining term at the point of cancellation, and how the £320 has been calculated. Contact Vodafone and ask for a full breakdown. Contracts can include terms that are not immediately obvious.",
                },
            ],
            keyChecks: ["Charge amount: £320", "Contract term and cancellation conditions", "How the fee has been calculated"],
        },
    },
];

const URGENCY_STYLES: Record<string, { color: string; bg: string }> = {
    "Time-Sensitive": { color: "#dc2626", bg: "#fff1f2" },
    Important: { color: "#b45309", bg: "#fef3c7" },
    Routine: { color: "#0e6e71", bg: "#f0fdfd" },
};

// ─── Modal ───────────────────────────────────────────────────────────────────

function BreakdownModal({ example, onClose }: { example: Example; onClose: () => void }) {
    const { breakdown } = example;

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const urgencyDot = breakdown.urgencyColor;

    return (
        <>
            <style>{`
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 35, 63, 0.55);
          backdrop-filter: blur(6px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: modalBackdropIn 0.25s ease forwards;
        }
        .modal-panel {
          background: #fff;
          border-radius: 24px;
          width: 100%;
          max-width: 680px;
          max-height: 88vh;
          overflow-y: auto;
          box-shadow: 0 32px 80px rgba(15, 35, 63, 0.18);
          animation: modalSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
          scrollbar-width: thin;
          scrollbar-color: #e2e8f0 transparent;
        }
        .modal-panel::-webkit-scrollbar { width: 6px; }
        .modal-panel::-webkit-scrollbar-track { background: transparent; }
        .modal-panel::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 999px; }
        .modal-close-btn {
          position: sticky;
          top: 0;
          float: right;
          margin: 20px 20px 0 0;
          z-index: 10;
        }
        .modal-close-btn button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .modal-close-btn button:hover {
          background: #e2e8f0;
          color: #0F233F;
        }
        .modal-section-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px 22px;
          margin-bottom: 14px;
        }
        .modal-section-card:last-child { margin-bottom: 0; }
        .key-check-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .key-check-item:last-child { border-bottom: none; padding-bottom: 0; }
        .key-check-item:first-child { padding-top: 0; }
      `}</style>

            <div
                className="modal-backdrop"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
                role="dialog"
                aria-modal="true"
                aria-label={`Full breakdown: ${example.type}`}
            >
                <div className="modal-panel">
                    {/* Sticky close */}
                    <div className="modal-close-btn">
                        <button onClick={onClose} aria-label="Close">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Header */}
                    <div style={{ padding: "28px 28px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                            <span
                                style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    padding: "5px 13px",
                                    borderRadius: 100,
                                    background: example.badgeBg,
                                    color: example.badgeColor,
                                    letterSpacing: "0.05em",
                                    textTransform: "uppercase",
                                }}
                            >
                                {example.badge}
                            </span>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "5px 13px",
                                    borderRadius: 100,
                                    background: URGENCY_STYLES[example.urgency]?.bg || "#f0fdf4",
                                    color: URGENCY_STYLES[example.urgency]?.color || "#16a34a",
                                    border: `1px solid ${URGENCY_STYLES[example.urgency]?.color || "#16a34a"}30`,
                                    letterSpacing: "0.03em",
                                }}
                            >
                                <span
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: urgencyDot,
                                        flexShrink: 0,
                                    }}
                                />
                                {breakdown.urgencyLabel}
                            </span>
                        </div>

                        <h2
                            style={{
                                fontSize: "1.6rem",
                                fontWeight: 900,
                                color: "#0F233F",
                                margin: "0 0 6px",
                                letterSpacing: "-0.02em",
                                lineHeight: 1.25,
                            }}
                        >
                            {example.type}
                        </h2>
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "#94a3b8",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                margin: "0 0 20px",
                            }}
                        >
                            Full Breakdown
                        </p>

                        {/* Teal divider */}
                        <div
                            style={{
                                height: 3,
                                borderRadius: 999,
                                background: "linear-gradient(90deg, #12A1A6, #54D6D4, transparent)",
                                marginBottom: 24,
                            }}
                        />

                        {/* Intro */}
                        <p
                            style={{
                                fontSize: "0.975rem",
                                color: "#334155",
                                lineHeight: 1.75,
                                margin: "0 0 28px",
                                fontWeight: 500,
                            }}
                        >
                            {breakdown.intro}
                        </p>
                    </div>

                    {/* Sections */}
                    <div style={{ padding: "0 28px 8px" }}>
                        {breakdown.sections.map((sec, i) => (
                            <div key={i} className="modal-section-card">
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        marginBottom: 10,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: "50%",
                                            background: "linear-gradient(135deg, #12A1A6, #54D6D4)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <span style={{ color: "#fff", fontWeight: 900, fontSize: "0.7rem" }}>{i + 1}</span>
                                    </div>
                                    <h3
                                        style={{
                                            fontSize: "0.9rem",
                                            fontWeight: 800,
                                            color: "#0F233F",
                                            margin: 0,
                                        }}
                                    >
                                        {sec.heading}
                                    </h3>
                                </div>
                                <p style={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.7, margin: sec.bullets ? "0 0 12px" : 0 }}>
                                    {sec.body}
                                </p>
                                {sec.bullets && (
                                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                                        {sec.bullets.map((b, bi) => (
                                            <li
                                                key={bi}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    gap: 10,
                                                    fontSize: "0.875rem",
                                                    color: "#334155",
                                                    lineHeight: 1.6,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: "50%",
                                                        background: "#12A1A6",
                                                        flexShrink: 0,
                                                        marginTop: 8,
                                                    }}
                                                />
                                                {b}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Key Checks */}
                    <div style={{ padding: "8px 28px 32px" }}>
                        <div
                            style={{
                                background: "linear-gradient(135deg, #f0fdfd, #e6faf9)",
                                border: "1px solid #99f6e4",
                                borderRadius: 14,
                                padding: "18px 22px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 14,
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="2.5">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color: "#12A1A6",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Key Things to Check
                                </span>
                            </div>
                            <div>
                                {breakdown.keyChecks.map((check, ci) => (
                                    <div key={ci} className="key-check-item">
                                        <div
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: "50%",
                                                background: "#12A1A620",
                                                border: "1.5px solid #12A1A640",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                marginTop: 1,
                                            }}
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#12A1A6" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span style={{ fontSize: "0.875rem", color: "#0e4f52", lineHeight: 1.55, fontWeight: 600 }}>{check}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ExamplesPage() {
    const router = useRouter();
    const [activeExample, setActiveExample] = useState<Example | null>(null);

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    const openModal = useCallback((ex: Example) => setActiveExample(ex), []);
    const closeModal = useCallback(() => setActiveExample(null), []);

    return (
        <div style={{ minHeight: "calc(100vh - 66px)", padding: "60px 24px 100px", background: "#f8fafc" }}>
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
        .arrow-icon { transform: rotate(0deg); transition: transform 0.3s ease; }
        @media (max-width: 768px) {
          .example-grid { grid-template-columns: 1fr; }
          .arrow-container { padding: 16px 0; z-index: 10; }
          .arrow-icon { transform: rotate(90deg); }
        }
        .view-breakdown-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #12A1A6;
          background: rgba(18, 161, 166, 0.08);
          border: 1.5px solid rgba(18, 161, 166, 0.25);
          border-radius: 8px;
          padding: 7px 14px;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s, transform 0.15s;
          white-space: nowrap;
          font-family: inherit;
        }
        .view-breakdown-btn:hover {
          background: rgba(18, 161, 166, 0.15);
          border-color: rgba(18, 161, 166, 0.45);
          transform: translateY(-1px);
        }
        .view-breakdown-btn:active { transform: translateY(0); }
      `}</style>

            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                {/* Page Header */}
                <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 52, animationDelay: "0ms" }}>
                    <span
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
                                    animationDelay: `${150 + i * 150}ms`,
                                }}
                            >
                                {/* Card Header */}
                                <div
                                    style={{
                                        padding: "18px 28px",
                                        background: "#f8fafc",
                                        borderBottom: "1px solid #f1f5f9",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 12,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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

                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: urgencyStyle.color }} />
                                            {ex.urgency}
                                        </div>

                                        {/* View Full Breakdown Button */}
                                        <button
                                            className="view-breakdown-btn"
                                            onClick={() => openModal(ex)}
                                            aria-label={`View full breakdown for ${ex.type}`}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Full Breakdown
                                        </button>
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

            {/* Modal */}
            {activeExample && <BreakdownModal example={activeExample} onClose={closeModal} />}
        </div>
    );
}
