"use client";

import { useRouter } from "next/navigation";
import { PricingSection, CTABanner } from "@/components/home";

export default function PricingPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ paddingTop: "40px", paddingBottom: "40px" }}>
            <PricingSection onScrollToUpload={handleRouteToUpload} />
            <CTABanner onScrollToUpload={handleRouteToUpload} />
        </div>
    );
}
