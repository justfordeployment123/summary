// __tests__/lib/api/ocr.test.ts
//
// Tests for triggerOCR.
// Requirements covered:
//   §5    OCR & Text Extraction
//   §5.2  Confidence scoring thresholds (≥85% ok, 70–84% flagged, <70% rejected)
//   §5.3  Three-layer OCR failure handling
//   §4.2  Corrupt file detection / clear user message

import { triggerOCR } from "@/lib/api";

const originalFetch = global.fetch;

beforeEach(() => {
    global.fetch = jest.fn();
});

afterAll(() => {
    global.fetch = originalFetch;
});

const basePayload = {
    jobId: "job-123",
    s3Key: "550e8400-e29b-41d4-a716-446655440000",
    fileType: "application/pdf",
};

// ─── successful OCR ──────────────────────────────────────────────────────────

describe("triggerOCR — successful extraction", () => {
    it("calls /api/process with POST and correct headers", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                message: "Success",
                extractedText: "Dear Sir,",
                confidenceFlag: false,
            }),
        });

        await triggerOCR(basePayload);

        expect(global.fetch).toHaveBeenCalledWith(
            "/api/process",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(basePayload),
            })
        );
    });

    // §5.2 — ≥85% confidence → confidenceFlag: false, processing proceeds normally
    it("returns confidenceFlag=false when confidence is high (≥85%)", async () => {
        const response = {
            message: "Success",
            extractedText: "Full readable letter text",
            confidenceFlag: false,
        };
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => response,
        });

        const result = await triggerOCR(basePayload);
        expect(result.confidenceFlag).toBe(false);
        expect(result.extractedText).toBe("Full readable letter text");
    });

    // §5.2 — 70–84% confidence → confidenceFlag: true, warning shown to user
    it("returns confidenceFlag=true when confidence is low (70–84%)", async () => {
        const response = {
            message: "Low confidence — re-upload recommended",
            extractedText: "Partially readable text...",
            confidenceFlag: true,
        };
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => response,
        });

        const result = await triggerOCR(basePayload);
        expect(result.confidenceFlag).toBe(true);
        expect(result.message).toContain("Low confidence");
    });

    // §5.1 — image file types also use OCR
    it.each(["image/jpeg", "image/png"])(
        "sends fileType=%s for image uploads going through Textract",
        async (fileType) => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    message: "Success",
                    extractedText: "Text from image",
                    confidenceFlag: false,
                }),
            });

            await triggerOCR({ ...basePayload, fileType });

            const body = JSON.parse(
                (global.fetch as jest.Mock).mock.calls[0][1].body
            );
            expect(body.fileType).toBe(fileType);
        }
    );

    it("passes jobId and s3Key in the request body", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                message: "ok",
                extractedText: "...",
                confidenceFlag: false,
            }),
        });

        await triggerOCR(basePayload);

        const body = JSON.parse(
            (global.fetch as jest.Mock).mock.calls[0][1].body
        );
        expect(body.jobId).toBe("job-123");
        expect(body.s3Key).toBe("550e8400-e29b-41d4-a716-446655440000");
    });
});

// ─── OCR failure handling ────────────────────────────────────────────────────

describe("triggerOCR — failure handling (§5.3)", () => {
    // Layer 3 — full failure / corrupt file
    it("throws with the server message when OCR fails (e.g. corrupt file)", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ message: "Document unreadable" }),
        });

        await expect(triggerOCR(basePayload)).rejects.toThrow(
            "Document unreadable"
        );
    });

    // §5.2 — <70% confidence → rejected, file deleted, re-upload requested
    it("throws when server rejects file due to confidence below 70%", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({
                message:
                    "Image quality too low. Please re-upload a clearer version.",
            }),
        });

        await expect(triggerOCR(basePayload)).rejects.toThrow(
            "Image quality too low"
        );
    });

    // §4.2 — corrupt PDF/DOCX parser error
    it("throws when the server reports a corrupt document", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({
                message:
                    "Failed to read the document. Please ensure it is clear and legible.",
            }),
        });

        await expect(triggerOCR(basePayload)).rejects.toThrow(
            "Failed to read the document"
        );
    });

    it("falls back to the default legibility message when server returns no message field", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({}),
        });

        await expect(triggerOCR(basePayload)).rejects.toThrow(
            "Failed to read the document. Please ensure it is clear and legible."
        );
    });

    it("falls back to default message when json() itself throws", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => {
                throw new Error("json parse fail");
            },
        });

        await expect(triggerOCR(basePayload)).rejects.toThrow(
            "Failed to read the document. Please ensure it is clear and legible."
        );
    });

    it("propagates a network-level error when fetch itself rejects", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
            new Error("Connection refused")
        );

        await expect(triggerOCR(basePayload)).rejects.toThrow(
            "Connection refused"
        );
    });
});