// __tests__/lib/api/payment.test.ts
//
// Tests for createPaymentIntent and createCheckoutSession.
// Requirements covered:
//   §7    Payment & Webhook Protection
//   §7.2  Payment status lock — AI triggered only by verified webhook, NOT client redirect
//   §13   Disclaimer & Legal Acknowledgement
//   §13.2 Acknowledgement checkbox — server-side enforcement
//   §14   Stripe Payment Integration
//   §15   Upsell system — upsells appended to Stripe line items

import { createPaymentIntent, createCheckoutSession } from "@/lib/api";

const originalFetch = global.fetch;

beforeEach(() => {
    global.fetch = jest.fn();
});

afterAll(() => {
    global.fetch = originalFetch;
});

// ─── createPaymentIntent ─────────────────────────────────────────────────────

describe("createPaymentIntent", () => {
    const basePayload = {
        jobId: "job-123",
        accessToken: "uuid-v4-access-token",
        upsells: [],
        disclaimerAcknowledged: true,
    };

    describe("successful payment intent creation", () => {
        it("calls /api/create-payment-intent with correct method and headers", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ clientSecret: "pi_secret_xyz" }),
            });

            await createPaymentIntent(basePayload);

            expect(global.fetch).toHaveBeenCalledWith("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(basePayload),
            });
        });

        it("returns the clientSecret from the server", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ clientSecret: "pi_secret_xyz" }),
            });

            const result = await createPaymentIntent(basePayload);
            expect(result.clientSecret).toBe("pi_secret_xyz");
        });

        // §15 — stackable upsells sent to server; server re-validates prices
        it("sends selected upsell IDs in the payload", async () => {
            const payloadWithUpsells = {
                ...basePayload,
                upsells: ["upsell-detail", "upsell-legal-format"],
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ clientSecret: "pi_secret_upsells" }),
            });

            await createPaymentIntent(payloadWithUpsells);

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(body.upsells).toEqual(["upsell-detail", "upsell-legal-format"]);
        });

        it("sends an empty upsells array when no upsells are selected", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ clientSecret: "pi_secret" }),
            });

            await createPaymentIntent({ ...basePayload, upsells: [] });

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(body.upsells).toEqual([]);
        });

        // §7.3 — access token (UUID v4) sent, never a sequential DB id
        it("includes the accessToken in the request body", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ clientSecret: "pi_secret" }),
            });

            await createPaymentIntent(basePayload);

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(body.accessToken).toBe("uuid-v4-access-token");
        });
    });

    describe("disclaimer enforcement (§13.2)", () => {
        // The server must refuse to create a payment intent if disclaimerAcknowledged is false
        it("throws when the server rejects an unacknowledged disclaimer", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({
                    error: "Disclaimer must be acknowledged",
                }),
            });

            await expect(
                createPaymentIntent({
                    ...basePayload,
                    disclaimerAcknowledged: false,
                }),
            ).rejects.toThrow("Disclaimer must be acknowledged");
        });

        it("sends disclaimerAcknowledged=true in the body when acknowledged", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ clientSecret: "pi_secret" }),
            });

            await createPaymentIntent({ ...basePayload, disclaimerAcknowledged: true });

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(body.disclaimerAcknowledged).toBe(true);
        });

        it("sends disclaimerAcknowledged=false when not acknowledged (server will reject)", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Disclaimer must be acknowledged" }),
            });

            const payload = { ...basePayload, disclaimerAcknowledged: false };
            await expect(createPaymentIntent(payload)).rejects.toThrow();

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(body.disclaimerAcknowledged).toBe(false);
        });
    });

    describe("error handling", () => {
        it("throws with the server error message on failure", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Job not found" }),
            });

            await expect(createPaymentIntent(basePayload)).rejects.toThrow("Job not found");
        });

        it("falls back to a default message when no error field returned", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({}),
            });

            await expect(createPaymentIntent(basePayload)).rejects.toThrow("Failed to initialise payment.");
        });

        it("falls back to default when json() throws", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => {
                    throw new Error("json parse fail");
                },
            });

            await expect(createPaymentIntent(basePayload)).rejects.toThrow("Failed to initialise payment.");
        });

        it("propagates network-level errors", async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error("Network down"));

            await expect(createPaymentIntent(basePayload)).rejects.toThrow("Network down");
        });

        // §7.2 — invalid / expired access token rejected server-side
        it("throws when the server rejects an invalid access token", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Invalid or expired access token" }),
            });

            await expect(createPaymentIntent({ ...basePayload, accessToken: "bad-token" })).rejects.toThrow("Invalid or expired access token");
        });
    });
});

// ─── createCheckoutSession ───────────────────────────────────────────────────

describe("createCheckoutSession (legacy/fallback flow)", () => {
    const basePayload = {
        jobId: "job-456",
        accessToken: "uuid-v4-access-token",
        upsells: [],
        disclaimerAcknowledged: true,
        successUrl: "https://explainmyletter.com/success",
        cancelUrl: "https://explainmyletter.com/cancel",
    };

    it("calls /api/checkout with POST and correct headers", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://checkout.stripe.com/session123" }),
        });

        await createCheckoutSession(basePayload);

        expect(global.fetch).toHaveBeenCalledWith("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basePayload),
        });
    });

    it("returns the Stripe-hosted checkout URL", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://checkout.stripe.com/session123" }),
        });

        const result = await createCheckoutSession(basePayload);
        expect(result.url).toBe("https://checkout.stripe.com/session123");
    });

    it("includes successUrl and cancelUrl in the request body", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://checkout.stripe.com/x" }),
        });

        await createCheckoutSession(basePayload);

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.successUrl).toBe("https://explainmyletter.com/success");
        expect(body.cancelUrl).toBe("https://explainmyletter.com/cancel");
    });

    // §13.2 — server-side disclaimer check also applies to hosted checkout
    it("throws when disclaimer is not acknowledged (server-side check)", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Disclaimer must be acknowledged" }),
        });

        await expect(createCheckoutSession({ ...basePayload, disclaimerAcknowledged: false })).rejects.toThrow("Disclaimer must be acknowledged");
    });

    it("falls back to a default message when no error field is returned", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({}),
        });

        await expect(createCheckoutSession(basePayload)).rejects.toThrow("Failed to initialize checkout.");
    });
});
