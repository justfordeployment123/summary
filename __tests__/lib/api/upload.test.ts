// // __tests__/lib/api/upload.test.ts
// //
// // Tests for requestUploadUrl and uploadFileToS3.
// // Requirements covered:
// //   §4.1  Accepted file types & size limits
// //   §4.2  Server-side validation (MIME + magic bytes, size, corrupt files)
// //   §4.3  Storage architecture — presigned URLs, UUID s3Key, access token
// //   §7.3  Secure job token — UUID v4 access token returned on init
// //   §12   Email capture & lead data — fields sent in payload

// import { requestUploadUrl, uploadFileToS3 } from "@/lib/api";

// const originalFetch = global.fetch;

// beforeEach(() => {
//     global.fetch = jest.fn();
// });

// afterAll(() => {
//     global.fetch = originalFetch;
// });

// // ─── requestUploadUrl ────────────────────────────────────────────────────────

// describe("requestUploadUrl", () => {
//     const basePayload = {
//         fileName: "letter.pdf",
//         fileType: "application/pdf",
//         category: "legal",
//         firstName: "John",
//         email: "john@example.com",
//         marketingConsent: true,
//     };

//     describe("successful responses", () => {
//         it("returns presignedUrl, s3Key, jobId and accessToken on success", async () => {
//             const mockResponse = {
//                 presignedUrl: "https://s3.amazonaws.com/presigned",
//                 s3Key: "550e8400-e29b-41d4-a716-446655440000",
//                 jobId: "job-abc",
//                 accessToken: "uuid-v4-access-token",
//             };

//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: true,
//                 json: async () => mockResponse,
//             });

//             const result = await requestUploadUrl(basePayload);
//             expect(result).toEqual(mockResponse);
//         });

//         it("calls /api/upload with POST and correct headers", async () => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: true,
//                 json: async () => ({
//                     presignedUrl: "https://s3.amazonaws.com/x",
//                     s3Key: "key",
//                     jobId: "j1",
//                     accessToken: "tok",
//                 }),
//             });

//             await requestUploadUrl(basePayload);

//             expect(global.fetch).toHaveBeenCalledWith("/api/upload", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(basePayload),
//             });
//         });

//         it("sends marketingConsent=false correctly (GDPR — consent is optional)", async () => {
//             const payload = { ...basePayload, marketingConsent: false };
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: true,
//                 json: async () => ({
//                     presignedUrl: "u",
//                     s3Key: "k",
//                     jobId: "j",
//                     accessToken: "t",
//                 }),
//             });

//             await requestUploadUrl(payload);

//             const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
//             expect(body.marketingConsent).toBe(false);
//         });

//         // §4.1 — accepted file types
//         it.each([
//             ["application/pdf", "doc.pdf"],
//             ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "doc.docx"],
//             ["image/jpeg", "scan.jpg"],
//             ["image/png", "scan.png"],
//         ])("accepts fileType=%s without throwing", async (fileType, fileName) => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: true,
//                 json: async () => ({
//                     presignedUrl: "u",
//                     s3Key: "k",
//                     jobId: "j",
//                     accessToken: "t",
//                 }),
//             });

//             await expect(requestUploadUrl({ ...basePayload, fileType, fileName })).resolves.toBeDefined();
//         });
//     });

//     describe("error handling", () => {
//         it("throws with the server error message when upload is rejected", async () => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: false,
//                 json: async () => ({ error: "Invalid file type" }),
//             });

//             await expect(requestUploadUrl(basePayload)).rejects.toThrow("Invalid file type");
//         });

//         // §4.1 — 10 MB size limit enforced server-side (HTTP 413)
//         it("throws when the server returns a file-too-large error", async () => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: false,
//                 json: async () => ({ error: "File exceeds maximum size of 10 MB" }),
//             });

//             await expect(requestUploadUrl(basePayload)).rejects.toThrow("File exceeds maximum size of 10 MB");
//         });

//         // §4.2 — MIME + magic bytes validation
//         it("throws when the server rejects a mismatched MIME type", async () => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: false,
//                 json: async () => ({
//                     error: "File content does not match declared type",
//                 }),
//             });

//             await expect(requestUploadUrl({ ...basePayload, fileType: "application/pdf" })).rejects.toThrow(
//                 "File content does not match declared type",
//             );
//         });

//         // §4.2 — corrupt file detection
//         it("throws with a clear message when the file is corrupt", async () => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: false,
//                 json: async () => ({ error: "Corrupt or unreadable file" }),
//             });

//             await expect(requestUploadUrl(basePayload)).rejects.toThrow("Corrupt or unreadable file");
//         });

//         it("falls back to a default error message when the server returns no error field", async () => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: false,
//                 json: async () => ({}),
//             });

//             await expect(requestUploadUrl(basePayload)).rejects.toThrow("Failed to initialize upload");
//         });

//         it("falls back to default message when json() itself fails", async () => {
//             (global.fetch as jest.Mock).mockResolvedValue({
//                 ok: false,
//                 json: async () => {
//                     throw new Error("Parse error");
//                 },
//             });

//             await expect(requestUploadUrl(basePayload)).rejects.toThrow("Failed to initialize upload");
//         });
//     });
// });

// // ─── uploadFileToS3 ──────────────────────────────────────────────────────────

// describe("uploadFileToS3", () => {
//     const presignedUrl = "https://s3.amazonaws.com/presigned-url";

//     // §4.3 — files uploaded directly to S3 via presigned URL (never through app server)
//     it("uses PUT with the correct Content-Type and file body", async () => {
//         const file = new File(["data"], "letter.pdf", {
//             type: "application/pdf",
//         });
//         (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

//         await uploadFileToS3(presignedUrl, file);

//         expect(global.fetch).toHaveBeenCalledWith(presignedUrl, {
//             method: "PUT",
//             headers: { "Content-Type": "application/pdf" },
//             body: file,
//         });
//     });

//     it.each([
//         ["application/pdf", "doc.pdf"],
//         ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "doc.docx"],
//         ["image/jpeg", "scan.jpg"],
//         ["image/png", "scan.png"],
//     ])("passes Content-Type=%s for each accepted format", async (type, name) => {
//         const file = new File(["x"], name, { type });
//         (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

//         await uploadFileToS3(presignedUrl, file);

//         const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
//         expect(headers["Content-Type"]).toBe(type);
//     });

//     it("resolves without a return value on success (void)", async () => {
//         const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
//         (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

//         const result = await uploadFileToS3(presignedUrl, file);
//         expect(result).toBeUndefined();
//     });

//     it("throws 'Failed to upload file to S3' when S3 returns a non-ok status", async () => {
//         const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
//         (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

//         await expect(uploadFileToS3(presignedUrl, file)).rejects.toThrow("Failed to upload file to S3");
//     });

//     it("propagates network errors (fetch rejection)", async () => {
//         const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
//         (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

//         await expect(uploadFileToS3(presignedUrl, file)).rejects.toThrow("Network error");
//     });
// });
