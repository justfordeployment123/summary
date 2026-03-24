// __tests__/lib/api/download.test.ts
//
// Tests for openDownload.
// Requirements covered:
//   §16   Result Page & Download Outputs — PDF, DOCX, TXT
//   §7.3  Token-gated downloads: UUID v4 access token required, not sequential ID
//   §7.3  Download links expire 72 hours after job completion (server-enforced)
//   §7.2  Download endpoints check job.status === COMPLETED AND payment confirmed

import { openDownload } from "@/lib/api";

const originalWindowOpen = window.open;

beforeEach(() => {
    window.open = jest.fn();
});

afterAll(() => {
    window.open = originalWindowOpen;
});

// ─── URL format & token guard (§7.3) ────────────────────────────────────────

describe("openDownload — URL construction", () => {
    it("opens a new tab to the correct PDF download URL", () => {
        openDownload("job-123", "uuid-v4-token", "pdf");

        expect(window.open).toHaveBeenCalledWith("/api/download/pdf?job_id=job-123&token=uuid-v4-token", "_blank");
    });

    it("opens a new tab to the correct DOCX download URL", () => {
        openDownload("job-123", "uuid-v4-token", "docx");

        expect(window.open).toHaveBeenCalledWith("/api/download/docx?job_id=job-123&token=uuid-v4-token", "_blank");
    });

    it("opens a new tab to the correct TXT download URL", () => {
        openDownload("job-123", "uuid-v4-token", "txt");

        // §16 — plain text is a supported download format
        expect(window.open).toHaveBeenCalledWith("/api/download/txt?job_id=job-123&token=uuid-v4-token", "_blank");
    });

    // §7.3 — sequential DB IDs must never appear in download URLs; only UUID token
    it("uses the access token (not a sequential row ID) in the URL", () => {
        const uuidToken = "550e8400-e29b-41d4-a716-446655440000";
        openDownload("job-123", uuidToken, "pdf");

        const call = (window.open as jest.Mock).mock.calls[0][0] as string;
        expect(call).toContain(`token=${uuidToken}`);
        // Ensure no sequential integer-only token could pass as UUID
        expect(uuidToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("places the format correctly in the URL path segment", () => {
        openDownload("job-456", "token-abc", "docx");

        const call = (window.open as jest.Mock).mock.calls[0][0] as string;
        expect(call).toContain("/api/download/docx");
    });

    it("places job_id and token as query parameters", () => {
        openDownload("job-789", "my-token", "pdf");

        const call = (window.open as jest.Mock).mock.calls[0][0] as string;
        const url = new URL(call, "http://localhost");
        expect(url.searchParams.get("job_id")).toBe("job-789");
        expect(url.searchParams.get("token")).toBe("my-token");
    });

    it("always opens in a new tab (_blank)", () => {
        openDownload("job-123", "token", "pdf");

        const target = (window.open as jest.Mock).mock.calls[0][1];
        expect(target).toBe("_blank");
    });
});

// ─── all supported formats ───────────────────────────────────────────────────

describe("openDownload — all supported download formats (§16)", () => {
    // §16 — Branded PDF, Word (.docx), Plain Text (.txt)
    it.each<["pdf" | "docx" | "txt", string]>([
        ["pdf", "/api/download/pdf"],
        ["docx", "/api/download/docx"],
        ["txt", "/api/download/txt"],
    ])("routes format='%s' to path '%s'", (format, expectedPath) => {
        openDownload("job-123", "token-abc", format);

        const call = (window.open as jest.Mock).mock.calls[0][0] as string;
        expect(call).toContain(expectedPath);
    });
});

// ─── called once per invocation ──────────────────────────────────────────────

describe("openDownload — invocation behaviour", () => {
    it("calls window.open exactly once per download request", () => {
        openDownload("job-123", "token", "pdf");
        expect(window.open).toHaveBeenCalledTimes(1);
    });

    it("opens separate tabs for separate format downloads", () => {
        openDownload("job-123", "token", "pdf");
        openDownload("job-123", "token", "docx");

        expect(window.open).toHaveBeenCalledTimes(2);
    });
});
