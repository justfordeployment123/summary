"use client";

import { FAQItem } from "@/components/home/cards";

const faqs = [
    {
        q: "What does Explain My Letter do?",
        a: "Explain My Letter helps you understand complex letters and emails by translating them into clear, simple English.",
    },
    {
        q: "Is the free summary really free?",
        a: "Yes — completely. No credit card, no sign-up needed. We generate a plain-English summary for every letter you upload at no cost.",
    },
    {
        q: "How does it work?",
        a: "You upload your letter, and we generate a clear summary of what it means. You can then choose to get a more detailed breakdown if needed.",
    },
    {
        q: "What types of letters can I upload?",
        a: "You can upload a wide range of documents, including government or tax letters, legal or court correspondence, medical letters, financial or banking documents, and employment-related letters — among many others.",
    },
    {
        q: "What file types can I upload?",
        a: "You can upload common file formats such as PDF, DOCX, and image files like JPG or PNG.",
    },
    {
        q: "How is my document kept private?",
        a: "Your document is uploaded directly to secure, encrypted systems and is automatically deleted within 24 hours. We never share or sell your data.",
    },
    {
        q: "Do you store my documents?",
        a: "No — uploaded documents are not stored long-term and are deleted after they have been processed.",
    },
    {
        q: "Do you sell or share my data?",
        a: "No — we do not sell, share, or use your data for advertising or third-party marketing.",
    },
    {
        q: "What does the paid breakdown include?",
        a: "The detailed breakdown provides a deeper explanation of your document, including key points, important dates, potential risks, and what your next steps might be — plus downloadable PDF, Word, and text files.",
    },
    {
        q: "How much does it cost?",
        a: "Pricing depends on the type of document and level of detail requested. You'll always see the price before confirming any payment.",
    },
    {
        q: "How long does it take?",
        a: "Most summaries are generated quickly after upload, so you can get clarity without waiting.",
    },
    {
        q: "Is this legal advice?",
        a: "No. Explain My Letter provides simplified explanations for general understanding only. It does not replace professional legal, financial, or medical advice.",
    },
    {
        q: "How accurate are the explanations?",
        a: "We aim to provide clear and accurate summaries based on the information in your document. However, for important decisions, we always recommend consulting a qualified professional.",
    },
    {
        q: "What if my document is unclear or poor quality?",
        a: "We do our best to process documents, but clearer images or files will give more accurate results. If needed, you may be asked to upload a better version.",
    },
    {
        q: "How secure is your payment system?",
        a: "We use Stripe, a leading global payment provider trusted by millions of businesses worldwide. All payments are securely encrypted, and your card details are never stored on our systems.",
    },
    {
        q: "What payment methods do you accept?",
        a: "We accept a range of secure payment methods, including major debit and credit cards. Depending on your device, you may also be able to use options like Apple Pay or Google Pay through Stripe.",
    },
    {
        q: "What should I do if I still don't understand my letter?",
        a: "If you need further clarification, you can reach out to us via the contact page. For important or urgent matters, we recommend speaking to a qualified professional.",
    },
];

export function FAQSection() {
    return (
        <section id="faqs" style={{ padding: "80px 24px", background: "#f8fafc" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 44 }}>
                    <div className="section-divider" />
                    <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "#0F233F", letterSpacing: "-0.02em", marginTop: 16 }}>
                        Frequently Asked Questions
                    </h2>
                    <p style={{ fontSize: "0.95rem", color: "#64748b", marginTop: 12, lineHeight: 1.6 }}>
                        Everything you need to know about Explain My Letter.
                    </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {faqs.map((f) => (
                        <FAQItem key={f.q} q={f.q} a={f.a} />
                    ))}
                </div>
            </div>
        </section>
    );
}
