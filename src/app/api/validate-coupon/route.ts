// app/api/validate-coupon/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
});

export async function POST(req: NextRequest) {
    const { couponCode, totalPrice } = await req.json();

    if (!couponCode) {
        return NextResponse.json({ valid: false, message: "No coupon code provided." }, { status: 400 });
    }

    try {
        // 1. Search for the code and explicitly ask Stripe to expand the nested coupon object
        const promoCodes = await stripe.promotionCodes.list({
            code: couponCode,
            active: true, 
            limit: 1,
            expand: ["data.promotion.coupon"], // <-- FIX 1: Returns the full object, not just an ID
        });

        if (promoCodes.data.length === 0) {
            return NextResponse.json({ valid: false, message: "Coupon code not found or expired." });
        }

        const promoCode = promoCodes.data[0];
        
        // 2. Access the coupon through the new 'promotion' hash
        const coupon = promoCode.promotion?.coupon;

        // 3. Type-narrowing to keep TypeScript happy. 
        // This ensures the expand worked and it's not just a string or deleted object.
        if (!coupon || typeof coupon === "string" || "deleted" in coupon) {
            return NextResponse.json({ valid: false, message: "Could not retrieve coupon details." }, { status: 500 });
        }

        // Calculate discount amount (in same unit as totalPrice, e.g. cents)
        let discountAmount = 0;
        let message = "";

        if (coupon.percent_off) {
            discountAmount = Math.round((totalPrice * coupon.percent_off) / 100);
            message = `${coupon.percent_off}% off applied!`;
        } else if (coupon.amount_off) {
            discountAmount = Math.min(coupon.amount_off, totalPrice); // can't discount more than total
            message = `${formatCents(coupon.amount_off)} off applied!`;
        }

        return NextResponse.json({
            valid: true,
            discountAmount,
            message,
        });
    } catch (err: unknown) {
        console.error("Stripe coupon validation error:", err);
        return NextResponse.json({ valid: false, message: "Could not validate coupon." }, { status: 500 });
    }
}

function formatCents(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}