// __tests__/lib/api/summary.test.ts
//
// Tests for generateFreeSummary.
// Requirements covered:
//   §11   Free Summary Layer
//   §9.1  1,200-word hard input cap enforced server-side
//   §10   Category-based prompt routing — urgency indicator values
//   §8.2  User-facing error messaging

import { generateFreeSummary } from "@/lib/api";

const originalFetch = global.fetch;

beforeEach(() => {
    global.fetch = jest.fn();
});

afterAll(() => {
    global.fetch = originalFetch;
});

const basePayload = {
    jobId: "job-123",
    extractedText: "This is a sample letter about your council tax account.",
};

// ─── successful summary ──────────────────────────────────────────────────────

describe("generateFreeSummary — successful responses", () => {
    it("calls /api/generate-free with POST and correct headers", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ summary: "Short summary.", urgency: "Routine" }),
        });

        await generateFreeSummary(basePayload);

        expect(global.fetch).toHaveBeenCalledWith(
            "/api/generate-free",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(basePayload),
            }),
        );
    });

    it("returns summary and urgency on success", async () => {
        const mockResponse = { summary: "Short summary.", urgency: "Routine" };
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await generateFreeSummary(basePayload);
        expect(result).toEqual(mockResponse);
    });

    // §11 — AI urgency indicator: Routine | Important | Time-Sensitive
    it.each(["Routine", "Important", "Time-Sensitive"])("accepts urgency value '%s' from the server", async (urgency) => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ summary: "A summary.", urgency }),
        });

        const result = await generateFreeSummary(basePayload);
        expect(result.urgency).toBe(urgency);
    });

    // §9.1 — 1,200-word hard input cap: the client sends the full text;
    //         truncation is enforced server-side, not client-side
    it("sends the full extracted text regardless of length (server enforces 1,200-word cap)", async () => {
        const longText = "word ".repeat(1500).trim(); // 1,500 words
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                summary: "Summary of truncated text.",
                urgency: "Routine",
            }),
        });

        await generateFreeSummary({ ...basePayload, extractedText: longText });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        // Client does NOT pre-truncate — full text is sent and server truncates
        expect(body.extractedText).toBe(longText);
    });

    it("includes jobId in the request body", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ summary: "S", urgency: "Routine" }),
        });

        await generateFreeSummary({ jobId: "job-xyz", extractedText: "text" });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.jobId).toBe("job-xyz");
    });
});

// ─── error handling ──────────────────────────────────────────────────────────

describe("generateFreeSummary — error handling", () => {
    it("throws with the server error message on failure", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "OpenAI request timed out" }),
        });

        await expect(generateFreeSummary(basePayload)).rejects.toThrow("OpenAI request timed out");
    });

    // §8.2 — no raw HTTP errors exposed; mapped to friendly messages
    it("falls back to a generic message when no error field is returned", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({}),
        });

        await expect(generateFreeSummary(basePayload)).rejects.toThrow("Failed to generate AI summary.");
    });

    it("falls back to default message when json() itself throws", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => {
                throw new Error("parse fail");
            },
        });

        await expect(generateFreeSummary(basePayload)).rejects.toThrow("Failed to generate AI summary.");
    });

    it("propagates a network-level error when fetch rejects", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error("Offline"));

        await expect(generateFreeSummary(basePayload)).rejects.toThrow("Offline");
    });

    // §8.1 — AI retry logic (handled server-side; client sees FAILED state)
    it("throws when the server reports all AI retries exhausted", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({
                error: "AI generation failed after maximum retries.",
            }),
        });

        await expect(generateFreeSummary(basePayload)).rejects.toThrow("AI generation failed after maximum retries.");
    });
});
