"use client";

import { useState } from "react";

export function ContactSection() {
    const [formData, setFormData] = useState({ name: "", email: "", message: "" });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Replace with your actual form submission logic
        window.location.href = `mailto:info@explainmyletter.co.uk?subject=Contact from ${formData.name}&body=${encodeURIComponent(formData.message)}%0A%0AFrom: ${formData.name} (${formData.email})`;
    };

    return (
        <section id="contact" style={{ padding: "80px 24px", background: "#fff" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 52 }}>
                    <div className="section-divider" />
                    <span className="feature-chip" style={{ marginBottom: 14, display: "inline-flex" }}>
                        Contact Us
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
                        Get in touch
                    </h2>
                    <p style={{ fontSize: "1rem", color: "#64748b", marginTop: 12, maxWidth: 500, margin: "12px auto 0", lineHeight: 1.6 }}>
                        If you have a question about how Explain My Letter works, or need support, please feel free to reach out.
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 40, alignItems: "start" }}>
                    {/* Left — contact info */}
                    <div>
                        <div
                            style={{
                                padding: "32px",
                                borderRadius: 20,
                                background: "linear-gradient(135deg,#0F233F,#1a3a5c)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 800,
                                    color: "#54D6D4",
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    marginBottom: 20,
                                }}
                            >
                                Contact Information
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            background: "rgba(84,214,212,0.15)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#54D6D4"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        >
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                                            Email
                                        </div>
                                        <a
                                            href="mailto:info@explainmyletter.co.uk"
                                            style={{
                                                color: "#fff",
                                                fontWeight: 700,
                                                fontSize: "0.9rem",
                                                textDecoration: "none",
                                                transition: "color 0.2s",
                                            }}
                                            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "#54D6D4")}
                                            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "#fff")}
                                        >
                                            info@explainmyletter.co.uk
                                        </a>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            background: "rgba(84,214,212,0.15)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#54D6D4"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                                            Response Time
                                        </div>
                                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>
                                            We aim to respond within 1 business day
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: 32,
                                    padding: "18px",
                                    borderRadius: 14,
                                    background: "rgba(84,214,212,0.1)",
                                    border: "1px solid rgba(84,214,212,0.2)",
                                }}
                            >
                                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>
                                    <strong style={{ color: "#54D6D4" }}>For data-related requests</strong> — including data deletion, access, or
                                    corrections — please email us and we will respond in accordance with our obligations under UK GDPR.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right — contact form */}
                    <div>
                        <div className="glass-card" style={{ padding: "32px" }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F233F", marginBottom: 24 }}>Send us a message</h3>
                            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 800,
                                            color: "#0F233F",
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Your Name <span style={{ color: "#f43f5e" }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Sarah Jones"
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 800,
                                            color: "#0F233F",
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Email Address <span style={{ color: "#f43f5e" }}>*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 800,
                                            color: "#0F233F",
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Message <span style={{ color: "#f43f5e" }}>*</span>
                                    </label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="How can we help you?"
                                        required
                                        rows={5}
                                        style={{
                                            fontFamily: "Raleway,sans-serif",
                                            width: "100%",
                                            padding: "14px 16px",
                                            border: "1.5px solid #e2e8f0",
                                            borderRadius: 12,
                                            fontSize: "0.9rem",
                                            fontWeight: 500,
                                            color: "#0F233F",
                                            background: "#fff",
                                            outline: "none",
                                            resize: "vertical",
                                            transition: "border-color 0.2s, box-shadow 0.2s",
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = "#54D6D4";
                                            e.target.style.boxShadow = "0 0 0 3px rgba(84,214,212,0.15)";
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = "#e2e8f0";
                                            e.target.style.boxShadow = "none";
                                        }}
                                    />
                                </div>
                                <button type="submit" className="btn-primary" style={{ marginTop: 4 }}>
                                    Send Message →
                                </button>
                                <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center" }}>
                                    Or email us directly at{" "}
                                    <a href="mailto:info@explainmyletter.co.uk" style={{ color: "#12A1A6", fontWeight: 700, textDecoration: "none" }}>
                                        info@explainmyletter.co.uk
                                    </a>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
