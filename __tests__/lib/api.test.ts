// __tests__/lib/api.test.ts

import {
    requestUploadUrl,
    uploadFileToS3,
    triggerOCR,
    generateFreeSummary,
    createPaymentIntent,
    createCheckoutSession,
    checkJobStatus,
    fetchUpsells,
    openDownload,
} from "@/lib/api";

describe("Frontend API Utilities (api.ts)", () => {
    // Save original fetch and window.open to restore later
    const originalFetch = global.fetch;
    const originalWindowOpen = window.open;

    beforeEach(() => {
        // Reset all mocks before each test
        global.fetch = jest.fn();
        // Mock window.open for the download test
        window.open = jest.fn();
    });

    afterAll(() => {
        // Restore globals after all tests
        global.fetch = originalFetch;
        window.open = originalWindowOpen;
    });

    describe("requestUploadUrl", () => {
        const mockPayload = {
            fileName: "test.pdf",
            fileType: "application/pdf",
            category: "legal",
            firstName: "John",
            email: "john@example.com",
            marketingConsent: true,
        };

        it("should successfully return upload credentials", async () => {
            const mockResponse = {
                presignedUrl: "https://s3.amazonaws.com/url",
                s3Key: "uuid-key",
                jobId: "job-123",
                accessToken: "token-abc",
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await requestUploadUrl(mockPayload);

            expect(global.fetch).toHaveBeenCalledWith("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mockPayload),
            });
            expect(result).toEqual(mockResponse);
        });

        it("should throw an error if the server rejects the upload", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Invalid file type" }),
            });

            await expect(requestUploadUrl(mockPayload)).rejects.toThrow("Invalid file type");
        });
    });

    describe("uploadFileToS3", () => {
        const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
        const presignedUrl = "https://s3.amazonaws.com/presigned-url";

        it("should successfully upload a file to S3", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

            await uploadFileToS3(presignedUrl, mockFile);

            expect(global.fetch).toHaveBeenCalledWith(presignedUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/pdf" },
                body: mockFile,
            });
        });

        it("should throw an error if the S3 upload fails", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

            await expect(uploadFileToS3(presignedUrl, mockFile)).rejects.toThrow("Failed to upload file to S3");
        });
    });

    describe("triggerOCR", () => {
        const mockPayload = { jobId: "job-123", s3Key: "uuid-key", fileType: "application/pdf" };

        it("should successfully trigger OCR and return text", async () => {
            const mockResponse = { message: "Success", extractedText: "Hello world", confidenceFlag: false };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await triggerOCR(mockPayload);
            expect(result).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith("/api/process", expect.any(Object));
        });

        it("should throw an error if OCR fails (e.g., corrupt file)", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({ message: "Document unreadable" }),
            });

            await expect(triggerOCR(mockPayload)).rejects.toThrow("Document unreadable");
        });
    });

    describe("generateFreeSummary", () => {
        const mockPayload = { jobId: "job-123", extractedText: "Long text..." };

        it("should return the summary and urgency", async () => {
            const mockResponse = { summary: "Short text", urgency: "Routine" };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await generateFreeSummary(mockPayload);
            expect(result).toEqual(mockResponse);
        });
    });

    describe("createPaymentIntent", () => {
        const mockPayload = {
            jobId: "job-123",
            accessToken: "token-abc",
            upsells: ["upsell-1"],
            disclaimerAcknowledged: true,
        };

        it("should return a client secret for Stripe Elements", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ clientSecret: "pi_secret_123" }),
            });

            const result = await createPaymentIntent(mockPayload);
            expect(result.clientSecret).toBe("pi_secret_123");
            expect(global.fetch).toHaveBeenCalledWith("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mockPayload),
            });
        });

        it("should throw an error if the disclaimer is not acknowledged", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Disclaimer must be acknowledged" }),
            });

            await expect(createPaymentIntent({ ...mockPayload, disclaimerAcknowledged: false })).rejects.toThrow("Disclaimer must be acknowledged");
        });
    });

    describe("checkJobStatus", () => {
        it("should correctly format the URL with query parameters", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: "COMPLETED" }),
            });

            const result = await checkJobStatus("job-123", "token-abc");

            // As per requirements: Sequential IDs never exposed in download URLs, uses UUID access token
            expect(global.fetch).toHaveBeenCalledWith("/api/jobs/job-123/status?token=token-abc");
            expect(result.status).toBe("COMPLETED");
        });
    });

    describe("openDownload", () => {
        it("should open a new window with the correct formatted URL", () => {
            openDownload("job-123", "token-abc", "pdf");

            // Verifies adherence to requirement: Download links protected by UUID v4 job access token
            expect(window.open).toHaveBeenCalledWith("/api/download/pdf?job_id=job-123&token=token-abc", "_blank");
        });

        it("should handle different formats correctly", () => {
            openDownload("job-123", "token-abc", "docx");
            expect(window.open).toHaveBeenCalledWith("/api/download/docx?job_id=job-123&token=token-abc", "_blank");
        });
    });
});
