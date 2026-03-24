"use client";

import { FAQItem } from "@/components/home/cards";

const faqs = [
    {
        q: "Is the free summary really free?",
        a: "Yes — completely. No credit card, no sign-up needed. We generate a plain-English summary for every letter you upload at no cost.",
    },
    {
        q: "What types of letters can I upload?",
        a: "Any formal letter: legal notices, NHS correspondence, HMRC or DWP letters, council communications, banking letters, landlord notices, employment letters, and more.",
    },
    {
        q: "How is my document kept private?",
        a: "Your document is uploaded directly to secure encrypted storage and is automatically deleted within 24 hours. We never share or sell your data.",
    },
    {
        q: "What does the paid breakdown include?",
        a: "A section-by-section structured analysis of your letter, with required actions, deadlines, and plain-English explanations of technical clauses — plus downloadable PDF, Word, and text files.",
    },
    {
        q: "Is this legal advice?",
        a: "No. ExplainMyLetter provides AI-generated summaries for general informational purposes only. Always consult a qualified professional before acting on any document.",
    },
];

export function FAQSection() {
    return (
        <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 44 }}>
                    <div className="section-divider" />
                    <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "#0F233F", letterSpacing: "-0.02em", marginTop: 16 }}>
                        Frequently Asked Questions
                    </h2>
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
