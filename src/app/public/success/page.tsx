"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { generatePaidSummary } from "../../../lib/api";

function SuccessContent() {
    const searchParams = useSearchParams();
    const jobId = searchParams.get("job_id");

    const [status, setStatus] = useState("Verifying secure payment...");
    const [breakdown, setBreakdown] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPaidBreakdown() {
            if (!jobId) {
                setError("No Job ID found in URL.");
                return;
            }

            // 1. Retrieve the text we saved before going to Stripe
            const extractedText = localStorage.getItem("pending_extracted_text");

            if (!extractedText) {
                setError("Document text lost. Please upload your document again to restart the process.");
                return;
            }

            try {
                // 2. Add a small 3-second delay to give the Stripe Webhook
                // enough time to update the database to PAYMENT_CONFIRMED.
                await new Promise((resolve) => setTimeout(resolve, 3000));

                setStatus("Payment confirmed! Generating your detailed breakdown... (This takes about 10-15 seconds)");

                // 3. Call the final paid generation API
                const response = await generatePaidSummary({
                    jobId,
                    extractedText,
                });

                // 4. Success! Clear local storage and display result
                setBreakdown(response.detailedBreakdown);
                localStorage.removeItem("pending_extracted_text");
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to generate breakdown. The payment might still be processing.");
            }
        }

        // Only run this once when the component mounts
        fetchPaidBreakdown();
    }, [jobId]);

    // Error UI
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border-t-4 border-red-500">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Oops!</h2>
                    <p className="text-gray-700">{error}</p>
                </div>
            </div>
        );
    }

    // Main Success UI
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-extrabold text-gray-900">Your Detailed Breakdown</h1>
                    {/* Show a pulsing status message while waiting for the AI */}
                    {!breakdown && <p className="mt-4 text-lg text-blue-600 animate-pulse font-medium">{status}</p>}
                </div>

                {/* Display the final Markdown breakdown */}
                {breakdown && (
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
                        <div className="p-6 sm:p-10">
                            {/* whitespace-pre-wrap ensures the AI's line breaks render correctly */}
                            <div className="prose max-w-none text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{breakdown}</div>
                        </div>
                        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500 text-center">
                                Disclaimer: This breakdown is AI-generated and does not constitute formal legal advice.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Next.js requires useSearchParams to be wrapped in a Suspense boundary
export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xl font-semibold">Loading your results...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
