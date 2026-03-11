"use client";

import { useState } from "react";
import { requestUploadUrl, uploadFileToS3, triggerOCR } from "@/lib/api";
export default function Home() {
    // Form Data States
    const [category, setCategory] = useState("");
    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // UI & Loading States
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    // The exact categories required by the client specifications
    const categories = [
        "Legal",
        "Medical/NHS",
        "Government/HMRC/DWP",
        "Financial / Banking",
        "Housing / Landlord / Council",
        "Employment / HR",
        "Insurance",
        "General / Other",
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Client-side validation: Enforce the 10MB maximum file size limit
            if (selectedFile.size > 10 * 1024 * 1024) {
                alert("File size must be less than 10MB");
                return;
            }
            setFile(selectedFile);
            setUploadStatus(""); // Reset status when a new file is chosen
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file || !category || !firstName || !email) {
            alert("Please fill out all required fields and upload a file.");
            return;
        }

        setIsUploading(true);
        setUploadStatus("1/4: Requesting secure upload URL...");

        try {
            // 1. Get Presigned URL
            const { presignedUrl, s3Key, jobId } = await requestUploadUrl({
                fileName: file.name,
                fileType: file.type,
                category,
                firstName,
                email,
                marketingConsent,
            });

            // 2. Upload to S3
            setUploadStatus("2/4: Uploading document directly to AWS...");
            await uploadFileToS3(presignedUrl, file);

            // 3. Trigger OCR Extraction
            setUploadStatus("3/4: Reading document text securely...");
            const ocrResult = await triggerOCR({
                jobId,
                s3Key,
                fileType: file.type,
            });

            // Client Specs state that if confidence is between 70-84%, we show a warning but continue
            if (ocrResult.confidenceFlag) {
                console.warn("Low OCR confidence flagged. Text might be slightly inaccurate.");
                // You could set a UI state here to show a small warning banner to the user later
            }

            setUploadStatus("4/4: Text extracted! Preparing AI summary...");
            console.log("Success! Extracted Text:", ocrResult.extractedText);
            console.log("OCR Confidence Warning Flag:", ocrResult.confidenceFlag);

            // Step 4 (Next Task): Send this extracted text to OpenAI
        } catch (error: any) {
            console.error("Upload/Processing failed:", error);
            setUploadStatus(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };
    return (
        <div className="max-w-2xl mx-auto mt-12 p-8 bg-white shadow-xl rounded-2xl border border-gray-100">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-bold mb-3 text-brand-dark">Upload Your Letter</h1>
                <p className="text-gray-600 text-lg">Get a plain-English summary instantly.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div>
                    <label className="block text-sm font-bold mb-2 text-brand-dark">Letter Type *</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-lightTeal transition-all bg-white"
                        required
                        disabled={isUploading}
                    >
                        <option value="" disabled>
                            Select a category...
                        </option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Lead Capture Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-brand-dark">First Name *</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-lightTeal transition-all"
                            placeholder="e.g. John"
                            required
                            disabled={isUploading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-brand-dark">Email Address *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-lightTeal transition-all"
                            placeholder="john@example.com"
                            required
                            disabled={isUploading}
                        />
                    </div>
                </div>

                {/* Marketing Consent */}
                <div className="flex items-center pt-2">
                    <input
                        type="checkbox"
                        id="marketing"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="mr-3 h-5 w-5 text-brand-teal focus:ring-brand-teal border-gray-300 rounded cursor-pointer"
                        disabled={isUploading}
                    />
                    <label htmlFor="marketing" className="text-sm text-gray-600 cursor-pointer select-none">
                        I agree to receive marketing updates (optional)
                    </label>
                </div>

                {/* File Upload Area */}
                <div
                    className={`mt-8 border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
                        file ? "border-brand-teal bg-brand-lightTeal/10" : "border-gray-300 hover:border-brand-teal hover:bg-gray-50"
                    }`}
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                        disabled={isUploading}
                    />
                    <label
                        htmlFor="file-upload"
                        className={`flex flex-col items-center justify-center h-full w-full ${
                            isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        }`}
                    >
                        <span className="text-brand-darkTeal font-bold text-lg mb-2">{file ? file.name : "Click to upload your document"}</span>
                        <span className="text-sm text-gray-500">PDF, DOCX, JPG, or PNG up to 10MB</span>
                    </label>
                </div>

                {/* Status Message Display */}
                {uploadStatus && (
                    <div
                        className={`p-4 rounded-lg text-sm text-center font-bold ${
                            uploadStatus.includes("Error")
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : "bg-brand-lightTeal/20 text-brand-darkTeal border border-brand-teal/30"
                        }`}
                    >
                        {uploadStatus}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-brand-teal hover:bg-brand-darkTeal disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl transition-colors mt-4 shadow-sm"
                >
                    {isUploading ? "Processing..." : "Generate Free Summary"}
                </button>
            </form>
        </div>
    );
}
