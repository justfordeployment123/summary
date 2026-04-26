"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/homeUtils";
import type { EmbeddedPaymentFormProps } from "@/types/home";

export function EmbeddedPaymentForm({ totalPrice, onSuccess, onError, isProcessing, setIsProcessing }: EmbeddedPaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();

    // Track local error state for display within this component
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handlePay = async () => {
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null); // Clear previous errors on new attempt

        const { error: submitError } = await elements.submit();
        if (submitError) {
            const msg = submitError.message || "Please check your payment details.";
            setErrorMessage(msg);
            onError(msg); // Still notify parent component
            setIsProcessing(false);
            return;
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href },
            redirect: "if_required",
        });

        if (error) {
            const msg = error.message || "Payment failed. Please try again.";
            setErrorMessage(msg);
            onError(msg);
            setIsProcessing(false);
        } else if (paymentIntent?.id) {
            setIsProcessing(false);
            onSuccess(paymentIntent.id);
        } else {
            const msg = "Payment status unknown. Please contact support.";
            setErrorMessage(msg);
            onError(msg);
            setIsProcessing(false);
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

            {/* Error Banner: Displayed directly above the button when an error occurs.
               Uses a soft red background with darker red text and an alert icon for high visibility.
            */}
            {errorMessage && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <div className="text-sm text-red-800 font-medium">{errorMessage}</div>
                </div>
            )}

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
