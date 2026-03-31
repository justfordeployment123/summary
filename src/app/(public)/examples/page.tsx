"use client";

import { markdownToHtml } from "@/lib/homeUtils";
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
    breakdown: string; // raw markdown
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
        breakdown: `This letter is a routine follow-up from St George's Hospital NHS Trust, confirming that your recent test results have been reviewed and that no immediate concerns have been identified. The wording suggests that this is not an emergency or urgent medical development, but part of an ongoing process of monitoring your health.

The appointment date given is 12 May 2026, which means the hospital wants to continue observing your condition or discussing your results in more detail. In many cases, letters like this are sent when results are stable, but the consultant or department still wants to review progress and keep your care on track.

## What this means in practice

At this stage, the letter appears to be reassuring rather than alarming. It is not saying that urgent treatment is needed, and it does not suggest that immediate action is required beyond attending the appointment.

This type of letter is commonly used when:

- Routine monitoring is needed
- Results were reviewed without major concern
- A follow-up appointment is being arranged as part of ongoing care

This does not mean the appointment is unimportant. It simply means that, based on what is written, the hospital is continuing with normal follow-up rather than responding to something critical.

## Understanding your position

It is helpful to see this letter as part of a wider care process rather than a warning. You are not being asked to make a difficult decision straight away, but you are expected to stay engaged with the appointment and any ongoing medical review.

Many people receive hospital letters and feel uncertain simply because the wording is formal. In this case, the practical message is that your care is continuing in a routine way.

You may choose to:

- Attend the appointment as arranged
- Rearrange it if the date is not suitable
- Prepare any questions you want answered about the results

## If anything is unclear

Even when a letter sounds routine, it is still reasonable to want more clarity. Medical correspondence often confirms what is happening without explaining the detail in everyday language.

You may want to check:

- What the test results actually showed
- Whether further tests are expected
- Whether there is anything you should monitor before the appointment

If the wording feels vague, you can raise these points at the appointment or contact the department in advance for clarification.

## If you cannot attend the appointment

If the appointment date is not possible, it is important not to simply miss it. Hospitals usually expect you to either attend or let them know that you need a different date.

A practical approach would be:

- Contact the hospital department as soon as possible
- Ask to rearrange the appointment
- Keep a note of the new date and time once confirmed

This helps avoid delays in your care and keeps the process moving smoothly.

## What to do next

To stay on top of the situation, a simple step-by-step approach can help:

1. Check the appointment date, time, and location carefully
2. Make a note of any symptoms or concerns you want to mention
3. Attend the appointment or rearrange it if necessary
4. Keep the letter somewhere safe in case you need the details later

**Key things to check** — The appointment date (12 May 2026), the hospital department or consultant name, and whether any preparation instructions are included.`,
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
        breakdown: `This letter is a payment request from British Gas, indicating that your account has fallen into arrears and now requires attention. While it is not yet a legal notice, the tone and wording suggest that the account is beginning to move beyond a standard reminder and into early escalation.

The amount being requested is £482.17, which relates to unpaid energy bills accumulated over a recent billing period. The key point in this letter is the 7-day deadline, which signals that the company is expecting prompt action and may take further steps if the situation is not addressed.

## What this means in practice

At this stage, the situation is still manageable, but it should not be ignored. This type of letter is usually sent before more serious action is considered.

If the balance remains unpaid, the account may progress to:

- Additional charges being added
- Referral to a debt collection process
- More formal escalation in future communications

This does not mean those steps have happened yet, but the letter is indicating that they are possible if no action is taken.

## Understanding your position

It is important to recognise that you are not limited to simply paying immediately. You still have control over how you respond to this situation.

You may choose to:

- Pay the full amount to resolve the issue
- Contact British Gas to arrange a repayment plan
- Check the bill carefully if something does not seem right

Many people assume these letters leave no room for flexibility, but in reality, companies often expect contact and engagement at this stage.

## If the amount doesn't look right

Before taking action, it is worth taking a moment to review the details. Billing issues can sometimes arise from estimated readings, missed payments, or overlapping charges.

You should check:

- The billing period covered
- Whether meter readings were estimated or actual
- If any charges seem unfamiliar

If anything appears incorrect, you can contact British Gas and ask for clarification before making payment.

## If you're unable to pay right now

If paying the full amount isn't possible, the most important thing is not to ignore the letter. Early communication usually leads to better outcomes.

A practical approach would be:

- Contact British Gas as soon as possible
- Explain your situation clearly
- Ask about repayment options or support arrangements

This shows willingness to resolve the issue and may prevent further escalation.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Review the bill carefully to confirm the amount
2. Decide whether you can pay in full or need support
3. Contact British Gas before the 7-day deadline
4. Keep a record of any communication

**Key things to check** — The total amount owed (£482.17), the deadline for action (7 days), and whether any charges appear incorrect.`,
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
        breakdown: `This letter is a formal court notice from the County Court Business Centre, confirming that a claim has been issued against you for £1,250. Unlike a warning letter or standard payment reminder, this means the matter has already moved into the legal process and now requires a formal response.

The most important part of the letter is the 14-day response deadline. That deadline is significant because, if no response is made in time, the court may enter judgment against you automatically. The letter is not asking whether you want to respond — it is telling you that you must.

## What this means in practice

At this stage, the claim is active, but it is still at a point where you can respond and take control of how the matter proceeds. The situation is serious, but it has not yet reached the stage where the outcome is fixed.

If the letter is ignored, the matter may progress to:

- A default judgment being entered against you
- Loss of the opportunity to challenge the claim properly
- Further enforcement action at a later stage

This does not mean those consequences are immediate, but the letter is making it clear that failing to respond could make the situation significantly harder to deal with.

## Understanding your position

It is important to understand that receiving a court claim does not automatically mean you have lost. You still have options, but the key is acting within the time allowed.

You may choose to:

- Accept the claim and deal with the payment
- Dispute the claim if you believe it is wrong
- Partially admit the claim and respond accordingly

Many people feel overwhelmed when they see court language, but the immediate priority is not to panic — it is to recognise that the deadline matters and that action is needed.

## If the claim doesn't look right

Before responding, it is worth checking the claim details carefully. Legal claims can still contain errors, missing information, or figures that you may not agree with.

You should check:

- The name of the claimant
- The amount being claimed
- The reason for the claim as stated in the form

If anything seems inaccurate or unfamiliar, that becomes an important point to investigate before deciding how to respond.

## If you're unsure how to deal with it

Court paperwork can feel more intimidating than ordinary letters, especially if you have not seen anything like this before. If you are unsure what the form means or how to reply, it may be sensible to seek legal clarification before the deadline expires.

A practical approach would be:

- Read the claim form carefully from start to finish
- Gather any related documents or previous correspondence
- Decide whether you agree, disagree, or partly agree with the claim

This will help you understand your position before taking the next formal step.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Note the response deadline immediately
2. Review the details of the claim carefully
3. Gather any documents relevant to the issue
4. Make sure a response is sent within the required timeframe

**Key things to check** — The amount being claimed (£1,250), the response deadline (14 days), and whether the claim details are accurate.`,
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
        breakdown: `This letter is from Tesco PLC and relates to a disciplinary meeting concerning your attendance. The wording indicates that your employer is raising a formal concern and is now moving the matter into an internal process where your explanation will be heard before any decision is made.

The meeting is scheduled for 5 April 2026, and the letter also confirms that you may bring a representative. That is an important detail because it shows this is not just an informal conversation — it is a formal stage in a workplace procedure.

## What this means in practice

At this point, the letter does not say that a decision has already been made. It is instead giving you notice of the concern and inviting you to respond.

This type of situation could lead to:

- A formal warning
- Further monitoring of your attendance
- Additional disciplinary action if concerns continue

This does not mean that one of those outcomes will definitely happen. It means the employer is now at the stage of reviewing the issue seriously and expects your participation in the process.

## Understanding your position

It is important to recognise that this meeting is your opportunity to explain your side of the situation. You are not just being told off — you are being invited into a process where your response matters.

You may choose to:

- Attend the meeting and explain the circumstances
- Bring a representative with you
- Prepare supporting information before the meeting

Many employees feel anxious when they receive disciplinary wording, but the key thing here is that the process is not finished. Your preparation and response can influence what happens next.

## If you disagree with the concerns raised

Before the meeting, it is worth reviewing the letter carefully and comparing it with your own understanding of what has happened. Sometimes workplace concerns are based on incomplete information or records that need context.

You should check:

- Whether the attendance concerns are factually accurate
- Whether there were medical or personal reasons involved
- Whether any dates or incidents mentioned are incorrect

If something is inaccurate, the meeting gives you a chance to explain that clearly and calmly.

## If you feel unprepared

It is common to feel unsure about what to say in a disciplinary meeting, especially when the wording of the letter feels formal or intimidating. The most helpful approach is usually to prepare a simple and factual explanation in advance.

A practical approach would be:

- Review your attendance history
- Make notes about any relevant circumstances
- Bring any evidence that supports your explanation

This helps you present your position more clearly and confidently.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Confirm that you will attend the meeting
2. Decide whether you want someone to accompany you
3. Prepare your explanation in advance
4. Gather any documents or evidence you may need

**Key things to check** — The meeting date (5 April 2026), your right to bring a representative, and whether the concerns described are accurate.`,
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
        breakdown: `This letter is from Aviva Insurance and confirms that your claim has been partially approved. The insurer has agreed to pay £1,200, but some items or parts of the claim have been declined because they say those elements are not covered under the policy.

The wording suggests that the claim has not been rejected outright, but that Aviva is limiting what it is prepared to pay. This kind of letter usually means the insurer accepts that a valid claim exists, but is relying on specific policy wording to reduce the overall payout.

## What this means in practice

At this stage, the insurer has made a decision, but that does not necessarily mean the matter is closed. You now know which part of the claim has been accepted and which part has not, which gives you a clearer basis for deciding what to do next.

If you are unhappy with the decision, the situation may progress to:

- A request for further explanation from the insurer
- An internal review or complaint
- A more formal dispute if the issue remains unresolved

This does not mean you need to challenge it automatically, but the letter is giving you enough information to consider whether the outcome feels fair and accurate.

## Understanding your position

It is important to recognise that you do not simply have to accept the wording at face value if something feels unclear. A partial approval means Aviva has accepted some responsibility, but it is also saying that certain parts fall outside your cover.

You may choose to:

- Accept the £1,200 payment as offered
- Ask Aviva for a clearer explanation of the exclusions
- Review the policy wording to see how the decision was reached

Many people find insurance letters frustrating because they refer to policy terms without always explaining them in simple language. That is often where a closer review becomes useful.

## If the decision doesn't look right

Before accepting the outcome, it is worth reviewing the details carefully. Sometimes items are declined because of missing evidence, interpretation of policy wording, or a misunderstanding about what was claimed.

You should check:

- Which specific items were declined
- What exclusion wording Aviva is relying on
- Whether any supporting evidence was overlooked

If anything appears incomplete or unclear, you can go back to the insurer and ask for a fuller explanation.

## If you want to challenge the outcome

If you do not agree with the decision, the most useful first step is usually to understand exactly why the insurer has limited the claim. That puts you in a better position to decide whether it is worth challenging.

A practical approach would be:

- Ask Aviva to explain the exclusions in plain terms
- Compare the decision with your policy wording
- Provide any extra evidence that may support your claim

This can help you decide whether the decision should stand or whether it is worth asking for a review.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Read the decision carefully from start to finish
2. Identify which parts of the claim were declined
3. Check the policy wording that relates to those items
4. Decide whether to accept the outcome or ask for a review

**Key things to check** — The approved payment amount (£1,200), which items or losses were declined, and the policy exclusions being relied on.`,
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
        breakdown: `This letter is from Barclays Bank, informing you that your account has gone beyond its agreed overdraft limit. The bank is asking you to take action to bring the balance back within the authorised range, and the wording suggests that this is now being treated as a concern rather than a routine fluctuation.

The amount referenced is £1,150 over your agreed limit, and you are being asked to address this within 10 days. This indicates that the bank is expecting relatively prompt action and is beginning to monitor the situation more closely.

## What this means in practice

This is not yet a formal default or enforcement situation, but it is moving in that direction if left unresolved. Banks typically send this type of letter when an account has remained outside agreed limits for longer than expected.

If the situation is not addressed, it may progress to:

- Additional charges or fees being applied
- Restrictions being placed on your account
- Referral to collections or recovery processes

This does not mean those actions have already been taken, but the letter is indicating that they may follow if no action is taken.

## Understanding your position

It is important to recognise that you still have options at this stage. The bank is prompting you to act, but it has not yet escalated the matter beyond your control.

You may choose to:

- Deposit funds to bring the balance back within limits
- Contact Barclays to discuss a temporary extension
- Speak to the bank about support if you are struggling financially

Many people assume that once they exceed an overdraft, there is little flexibility. In reality, banks often expect customers to make contact and discuss solutions before the situation worsens.

## If something doesn't look right

Before taking action, it is worth reviewing your account activity carefully. Sometimes balances can be affected by unexpected charges, timing of payments, or pending transactions.

You should check:

- Recent transactions and withdrawals
- Any fees that have been added
- Whether payments have cleared correctly

If anything appears unclear or incorrect, you can contact Barclays for clarification.

## If you're experiencing financial difficulty

If you are unable to bring the account back within limits straight away, the most important step is to communicate with the bank early.

A practical approach would be:

- Contact Barclays as soon as possible
- Explain your financial situation
- Ask about support options or temporary arrangements

This can help prevent further escalation and may give you more manageable options.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Check your current balance and recent activity
2. Work out how much is needed to return within the limit
3. Decide whether you can pay or need support
4. Contact Barclays before the 10-day timeframe

**Key things to check** — The amount over your limit (£1,150), the timeframe given (10 days), and any charges or fees applied.`,
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
        breakdown: `This letter is from HM Revenue & Customs (HMRC), stating that you have underpaid tax for a previous tax year. The amount being requested is £2,340, and you are required to take action within 30 days.

The wording indicates that this is a formal request for payment rather than an informal notice. HMRC letters are typically clear about expectations, and this one suggests that the matter has already been reviewed and calculated.

## What this means in practice

This is a formal financial request from a government authority, and it should be taken seriously. While it is not immediate enforcement, it is a step that can lead to further action if ignored.

If the situation is not addressed, it may progress to:

- Interest being added to the amount owed
- Penalties for non-payment
- More formal enforcement measures

This does not mean those steps are happening now, but the letter is indicating that they may follow if no action is taken.

## Understanding your position

It is important to understand that you are not limited to simply paying immediately. You have the opportunity to review the figures and decide how to respond.

You may choose to:

- Pay the amount in full
- Contact HMRC to arrange a payment plan
- Review the calculation if you believe it is incorrect

Many people feel pressure when receiving HMRC correspondence, but there is usually room to engage and resolve the situation constructively.

## If the amount doesn't look right

Before making any payment, it is sensible to review how the figure has been calculated. Tax calculations can sometimes be affected by incorrect income details, missing allowances, or outdated information.

You should check:

- The tax year referenced
- The income figures used
- Whether any allowances or reliefs are missing

If anything seems incorrect, you can contact HMRC and request a review.

## If you're unable to pay

If paying the full amount is not possible, HMRC often allows structured arrangements if you engage early.

A practical approach would be:

- Contact HMRC as soon as possible
- Explain your situation
- Ask about a Time to Pay arrangement

This can help spread the cost and avoid further escalation.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Review the calculation carefully
2. Confirm whether the amount appears correct
3. Decide whether to pay or query it
4. Contact HMRC within the 30-day period

**Key things to check** — The amount owed (£2,340), the deadline (30 days), and the tax year and calculation details.`,
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
        breakdown: `This letter is from your housing association, informing you that your rent account is in arrears. The amount outstanding is £1,800, and you are being asked to take action within 14 days.

The wording suggests that this is moving beyond a simple reminder and into a more formal stage of the process, where the landlord is expecting a response.

## What this means in practice

At this stage, the situation is serious but still manageable. This type of letter is typically sent before legal action is considered.

If the arrears are not addressed, the situation may progress to:

- Formal legal proceedings
- Possibility of eviction action
- Further escalation of the tenancy issue

This does not mean eviction is happening now, but the letter is indicating that the situation could move in that direction if ignored.

## Understanding your position

It is important to recognise that you still have options and the ability to engage with the landlord before things escalate further.

You may choose to:

- Pay some or all of the arrears
- Contact the landlord to arrange a repayment plan
- Seek advice or support

Many tenants assume these letters mean immediate action will be taken, but landlords often expect communication and are willing to agree arrangements.

## If the amount doesn't look right

Before taking action, it is worth checking your records to confirm the accuracy of the arrears.

You should check:

- Rent payments made
- Dates of missed payments
- Any discrepancies in the account

If something seems incorrect, you can raise this with the landlord.

## If you're unable to pay

If you cannot pay the full amount, early communication is essential.

A practical approach would be:

- Contact the housing association immediately
- Explain your situation
- Request a repayment arrangement

This can help prevent further escalation and demonstrate that you are engaging.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Confirm the amount owed
2. Review your payment history
3. Contact the landlord within the 14-day period
4. Agree a plan if needed

**Key things to check** — The arrears amount (£1,800), the timeframe (14 days), and any references to legal action.`,
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
        breakdown: `This letter is from Thames Water, stating that you have an outstanding balance of £265.40 on your account. The company is asking for payment within 10 days, and the wording suggests that the account is being reviewed for further action if unresolved.

## What this means in practice

This is a billing escalation letter rather than an immediate enforcement notice. However, it indicates that the account is no longer being treated as a routine overdue balance.

If the issue is not resolved, it may progress to:

- Further reminders or escalation
- Additional charges
- Possible involvement of recovery processes

This does not mean those steps have happened yet, but the letter is indicating that they may follow.

## Understanding your position

You still have control over how to respond. At this stage, service providers are usually expecting engagement rather than immediate escalation.

You may choose to:

- Pay the balance
- Arrange a payment plan
- Check the bill for accuracy

Many customers assume that these letters leave no flexibility, but service providers often allow time to resolve the issue if you make contact.

## If the amount doesn't look right

Before paying, it is worth reviewing the details carefully.

You should check:

- The billing period
- Meter readings
- Previous payments

If anything appears unclear, you can contact Thames Water to request clarification.

## If you're unable to pay

If paying in full is not possible, it is important to communicate early.

A practical approach would be:

- Contact Thames Water
- Explain your situation
- Ask about payment arrangements

This can help prevent escalation and keep the account manageable.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Review the bill
2. Decide whether to pay or query it
3. Contact the provider within the timeframe
4. Keep a record of communication

**Key things to check** — The amount owed (£265.40), the deadline (10 days), and any unusual charges.`,
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
        breakdown: `This letter is from Harris Academy, raising concerns about attendance and requesting a meeting within 7 days. The wording suggests that the school is formally monitoring the situation and expects engagement from you.

## What this means in practice

This is an early-stage intervention rather than a disciplinary outcome. The school is identifying a concern and asking for a discussion before taking any further steps.

If the situation continues, it may lead to:

- Ongoing monitoring
- Further meetings
- Escalation within school processes

This does not mean action has already been taken, but the letter indicates that the issue is now being treated formally.

## Understanding your position

You have the opportunity to explain the situation and provide context before any further action is considered.

You may choose to:

- Attend the meeting
- Provide an explanation
- Submit any supporting evidence

Many education letters are formal in tone, but they are often part of a process designed to resolve issues early.

## If the concerns don't seem accurate

Before attending the meeting, it is helpful to review your understanding of the situation.

You should check:

- Attendance records
- Any absences that had valid reasons
- Whether the details in the letter are correct

If anything appears incorrect, you can raise this during the meeting.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Confirm the meeting date
2. Review attendance history
3. Prepare your explanation
4. Attend the meeting

**Key things to check** — The meeting timeframe (7 days), the reason for concern, and any records referenced.`,
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
        breakdown: `This letter is from the Department for Work and Pensions (DWP) regarding your Universal Credit claim. It states that an overpayment of £980 has been identified and that action is required within 14 days.

The wording indicates that the DWP believes you have received more than you were entitled to, and they are now seeking to recover that amount. This is a formal communication rather than a routine update.

## What this means in practice

At this stage, the DWP has made a decision about your claim and is now moving into recovery of the overpayment. This does not automatically mean the decision is final or cannot be questioned, but it does mean the issue is now active and requires attention.

If the situation is not addressed, it may progress to:

- Deductions from future benefit payments
- Requests for repayment arrangements
- Further recovery action

This does not mean those steps have already started, but the letter is indicating that they are possible if no action is taken.

## Understanding your position

It is important to recognise that you still have options. You are not limited to accepting the decision without question.

You may choose to:

- Accept the overpayment and arrange repayment
- Review the decision if you believe it is incorrect
- Contact the DWP for clarification

Many people assume that benefit decisions cannot be challenged, but there is usually a process available if something does not seem right.

## If the decision doesn't look right

Before agreeing to repay anything, it is worth reviewing the details carefully. Overpayments can sometimes occur due to incorrect information, delays in updates, or misunderstandings about entitlement.

You should check:

- The reason given for the overpayment
- The time period it relates to
- Whether your circumstances were reported correctly

If anything appears unclear or incorrect, you can contact the DWP and ask for further explanation.

## If you're unable to repay

If paying the full amount is not possible, the most important step is to engage early rather than ignore the letter.

A practical approach would be:

- Contact the DWP as soon as possible
- Explain your financial situation
- Ask about repayment arrangements or deductions

This can help ensure that any repayment plan is manageable.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Read the letter carefully to understand the decision
2. Check whether the overpayment appears accurate
3. Decide whether to accept or question it
4. Contact the DWP within the 14-day timeframe

**Key things to check** — The amount owed (£980), the deadline (14 days), and the reason given for the overpayment.`,
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
        breakdown: `This letter is from Vodafone UK regarding an early termination of your mobile phone contract. It states that a charge of £320 is due because the agreement has been ended before the minimum contract term.

The wording indicates that the charge is based on the terms of your contract, specifically relating to early cancellation. This is not a penalty in the sense of wrongdoing, but a fee linked to the agreement you entered into.

## What this means in practice

At this stage, Vodafone is applying the terms of the contract and requesting payment. This is a common outcome when a contract is ended early, particularly where a fixed-term agreement was in place.

If the situation is not addressed, it may progress to:

- Further billing or reminders
- Account escalation
- Possible recovery action

This does not mean those steps have already happened, but the letter is indicating that the balance is now expected.

## Understanding your position

It is important to recognise that you still have the opportunity to review whether the charge has been applied correctly. Not all contract charges are straightforward, and it is reasonable to check the basis of the fee.

You may choose to:

- Pay the amount as requested
- Ask Vodafone to explain how the figure was calculated
- Review your contract terms

Many people accept these charges without question, but checking the detail can sometimes highlight areas that need clarification.

## If the charge doesn't look right

Before making payment, it is worth reviewing the contract and the explanation provided.

You should check:

- The length of the original contract
- The remaining term at the point of cancellation
- How the £320 charge has been calculated

If anything appears unclear, you can contact Vodafone and ask for a breakdown.

## If you're unsure about the agreement

Contracts can often include terms that are not obvious at first glance. If the wording feels unclear, it may be helpful to ask for clarification rather than assume the charge is fixed.

A practical approach would be:

- Contact Vodafone
- Ask for a detailed explanation of the charge
- Request confirmation of the relevant contract terms

This can help you understand whether the amount is accurate.

## What to do next

To stay in control of the situation, a simple step-by-step approach can help:

1. Review the contract details
2. Check how the charge has been calculated
3. Decide whether to accept or query it
4. Contact Vodafone if clarification is needed

**Key things to check** — The charge amount (£320), the contract term and cancellation conditions, and how the fee has been calculated.`,
    },
];

const URGENCY_STYLES: Record<string, { color: string; bg: string }> = {
    "Time-Sensitive": { color: "#dc2626", bg: "#fff1f2" },
    Important: { color: "#b45309", bg: "#fef3c7" },
    Routine: { color: "#0e6e71", bg: "#f0fdfd" },
};

// ─── Modal ───────────────────────────────────────────────────────────────────

function BreakdownModal({ example, onClose }: { example: Example; onClose: () => void }) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const urgencyStyle = URGENCY_STYLES[example.urgency] || URGENCY_STYLES["Routine"];

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
                    max-width: 780px;
                    max-height: 90vh;
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

                    {/* Header — matches CompletedView style */}
                    <div style={{ borderLeft: "8px solid #08121f", margin: "28px 28px 0 28px", paddingLeft: 24 }}>
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
                                    background: urgencyStyle.bg,
                                    color: urgencyStyle.color,
                                    border: `1px solid ${urgencyStyle.color}30`,
                                    letterSpacing: "0.03em",
                                }}
                            >
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: urgencyStyle.color, flexShrink: 0 }} />
                                {example.urgency}
                            </span>
                        </div>
                        <h2
                            style={{
                                fontSize: "1.6rem",
                                fontWeight: 900,
                                color: "#0F233F",
                                margin: "0 0 4px",
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
                                margin: "0 0 0",
                            }}
                        >
                            Full Breakdown
                        </p>
                    </div>

                    {/* Teal accent divider */}
                    <div
                        style={{
                            height: 3,
                            borderRadius: 999,
                            background: "linear-gradient(90deg, #12A1A6, #54D6D4, transparent)",
                            margin: "20px 28px 0",
                        }}
                    />

                    {/* Markdown content — rendered exactly like CompletedView */}
                    <div style={{ padding: "0 0 32px" }} dangerouslySetInnerHTML={{ __html: markdownToHtml(example.breakdown) }} />
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
