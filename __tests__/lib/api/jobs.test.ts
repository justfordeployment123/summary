// __tests__/lib/api/jobs.test.ts
//
// Tests for checkJobStatus.
// Requirements covered:
//   §6    Job State Architecture — 11 defined states
//   §6.2  State management rules — transitions server-side only
//   §7.2  Client redirect DOES NOT trigger AI; success page polls state
//   §7.3  URL enumeration guard — UUID token in query string, not sequential ID
//   §8.2  User-facing error messaging — no indefinite loading states

import { checkJobStatus } from "@/lib/api";

const originalFetch = global.fetch;

beforeEach(() => {
    global.fetch = jest.fn();
});

afterAll(() => {
    global.fetch = originalFetch;
});

// ─── URL construction ────────────────────────────────────────────────────────

describe("checkJobStatus — URL construction (§7.3)", () => {
    it("uses the correct endpoint with jobId and token as query param", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: "COMPLETED" }),
        });

        await checkJobStatus("job-123", "uuid-v4-token");

        // §7.3 — sequential IDs never exposed; UUID token used for access control
        expect(global.fetch).toHaveBeenCalledWith("/api/jobs/job-123/status?token=uuid-v4-token");
    });

    it("correctly embeds different jobId values in the URL path", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: "AWAITING_PAYMENT" }),
        });

        await checkJobStatus("job-abc-999", "token-xyz");

        expect(global.fetch).toHaveBeenCalledWith("/api/jobs/job-abc-999/status?token=token-xyz");
    });
});

// ─── all valid job states (§6.1) ─────────────────────────────────────────────

describe("checkJobStatus — all defined job states (§6.1)", () => {
    // The 11 states defined in the requirements state machine
    const validStates = [
        "UPLOADED",
        "OCR_PROCESSING",
        "OCR_FAILED",
        "FREE_SUMMARY_GENERATING",
        "FREE_SUMMARY_COMPLETE",
        "AWAITING_PAYMENT",
        "PAYMENT_CONFIRMED",
        "PAID_BREAKDOWN_GENERATING",
        "COMPLETED",
        "FAILED",
        "REFUNDED",
    ];

    it.each(validStates)("returns status='%s' correctly", async (status) => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status }),
        });

        const result = await checkJobStatus("job-123", "token");
        expect(result.status).toBe(status);
    });
});

// ─── successful polling responses ────────────────────────────────────────────

describe("checkJobStatus — successful responses", () => {
    it("returns status COMPLETED with breakdown and urgency", async () => {
        const mockResponse = {
            status: "COMPLETED",
            detailedBreakdown: "Full analysis of your letter...",
            urgency: "Time-Sensitive",
            referenceId: "REF-2024-001",
        };
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await checkJobStatus("job-123", "token-abc");
        expect(result).toEqual(mockResponse);
    });

    it("returns status AWAITING_PAYMENT without breakdown (not yet paid)", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: "AWAITING_PAYMENT" }),
        });

        const result = await checkJobStatus("job-123", "token-abc");
        expect(result.status).toBe("AWAITING_PAYMENT");
        expect(result.detailedBreakdown).toBeUndefined();
    });

    // §7.2 — paid breakdown is generated only after webhook; client success
    //         page polls this endpoint rather than triggering AI itself
    it("returns status PAYMENT_CONFIRMED (breakdown not yet generated)", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: "PAYMENT_CONFIRMED" }),
        });

        const result = await checkJobStatus("job-123", "token-abc");
        expect(result.status).toBe("PAYMENT_CONFIRMED");
    });

    it("returns status PAID_BREAKDOWN_GENERATING while AI is processing", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: "PAID_BREAKDOWN_GENERATING" }),
        });

        const result = await checkJobStatus("job-123", "token-abc");
        expect(result.status).toBe("PAID_BREAKDOWN_GENERATING");
    });

    // §8.1 / §6.1 — FAILED state returned after all AI retries exhausted
    it("returns status FAILED with an error message", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                status: "FAILED",
                error: "We encountered an issue processing your document. Our team has been notified.",
            }),
        });

        const result = await checkJobStatus("job-123", "token-abc");
        expect(result.status).toBe("FAILED");
        expect(result.error).toContain("Our team has been notified");
    });

    // §6.1 — REFUNDED state: download access revoked
    it("returns status REFUNDED", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: "REFUNDED" }),
        });

        const result = await checkJobStatus("job-123", "token-abc");
        expect(result.status).toBe("REFUNDED");
    });
});

// ─── error handling ──────────────────────────────────────────────────────────

describe("checkJobStatus — error handling", () => {
    it("throws with the server error message on non-ok response", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Job not found" }),
        });

        await expect(checkJobStatus("job-999", "token")).rejects.toThrow("Job not found");
    });

    // §7.3 — invalid token returns 403; we expect an error to be thrown
    it("throws when the server rejects an invalid or expired token", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Access token invalid or expired" }),
        });

        await expect(checkJobStatus("job-123", "bad-token")).rejects.toThrow("Access token invalid or expired");
    });

    it("falls back to a generic message when no error field is returned", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({}),
        });

        await expect(checkJobStatus("job-123", "token")).rejects.toThrow("Unable to retrieve your results.");
    });

    it("falls back to default message when json() itself throws", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => {
                throw new Error("json parse fail");
            },
        });

        await expect(checkJobStatus("job-123", "token")).rejects.toThrow("Unable to retrieve your results.");
    });

    it("propagates network-level errors", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error("Network timeout"));

        await expect(checkJobStatus("job-123", "token")).rejects.toThrow("Network timeout");
    });
});
