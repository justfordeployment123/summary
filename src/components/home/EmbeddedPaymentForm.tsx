"use client";

import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/homeUtils";
import type { EmbeddedPaymentFormProps } from "@/types/home";

export function EmbeddedPaymentForm({ totalPrice, onSuccess, onError, isProcessing, setIsProcessing }: EmbeddedPaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();

    const handlePay = async () => {
        if (!stripe || !elements) return;

        setIsProcessing(true);

        // ✅ Fix 1: Submit elements first (required on mobile for field validation)
        const { error: submitError } = await elements.submit();
        if (submitError) {
            onError(submitError.message || "Please check your payment details.");
            setIsProcessing(false);
            return;
        }

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href },
            redirect: "if_required",
        });

        if (error) {
            onError(error.message || "Payment failed. Please try again.");
            setIsProcessing(false);
        } else {
            // ✅ Fix 2: Reset processing state before calling onSuccess
            // in case the component stays mounted
            setIsProcessing(false);
            onSuccess();
        }
    };

    return (
        <div className="mb-4">
            <PaymentElement
                options={{
                    layout: "tabs",
                    fields: { billingDetails: "auto" },
                }}
            />
            <br />
            <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing || !stripe || !elements}
                className="
                    w-full mt-6
                    h-14 px-4
                    rounded-xl font-bold text-base
                    bg-teal-600 hover:bg-teal-700
                    disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                    text-white
                    flex items-center justify-center gap-2
                    transition-all
                    shadow-md hover:shadow-lg active:scale-95 active:shadow-sm
                "
            >
                {isProcessing ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Processing payment…
                    </>
                ) : (
                    `Pay ${formatPrice(totalPrice)} — Get Breakdown →`
                )}
            </button>
        </div>
    );
}
