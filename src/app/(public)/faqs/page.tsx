"use client";

import { useRouter } from "next/navigation";
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

export default function FAQsPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ minHeight: "calc(100vh - 66px)", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
            {/* Custom keyframes for animations */}
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
            `}</style>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: "60px 24px 80px" }}>
                <div style={{ maxWidth: 760, margin: "0 auto" }}>
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
                            FAQs
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
                            Frequently Asked Questions
                        </h1>
                        <p
                            style={{
                                fontSize: "1.1rem",
                                color: "#64748b",
                                marginTop: 16,
                                maxWidth: 500,
                                margin: "16px auto 0",
                                lineHeight: 1.6,
                            }}
                        >
                            Everything you need to know about Explain My Letter.
                        </p>
                    </div>

                    {/* FAQ Items List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {faqs.map((f, i) => (
                            <div
                                key={f.q}
                                className="animate-fade-up"
                                // Faster 50ms stagger so the list loads smoothly without taking too long
                                style={{ animationDelay: `${150 + i * 50}ms` }}
                            >
                                <FAQItem q={f.q} a={f.a} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Integrated CTA Banner at the bottom */}
            <section
                className="hero-mesh animate-fade-up"
                style={{
                    padding: "80px 24px",
                    textAlign: "center",
                    background: "linear-gradient(135deg, #0F233F, #1a3a5c)",
                    animationDelay: "800ms",
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
                            /* Reset default button styles */
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",

                            /* Apply the <h2> typography */
                            fontSize: "2rem",
                            fontWeight: 900,
                            color: "#0F233F",
                            letterSpacing: "-0.02em",
                            marginTop: 10,
                            lineHeight: 1.15,
                            fontFamily: "Raleway, sans-serif", // Keeping your brand font

                            /* Setup for smooth hover effect */
                            transition: "color 0.2s ease",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#12A1A6"; // Changes to teal on hover
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#0F233F"; // Reverts to dark blue
                        }}
                    >
                        Upload your letter
                    </button>
                </div>
            </section>
        </div>
    );
}
