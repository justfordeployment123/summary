"use client";

import { useRouter } from "next/navigation";
import { HowItWorksSection, CTABanner } from "@/components/home";

export default function HowItWorksPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ paddingTop: "40px", paddingBottom: "40px" }}>
            <HowItWorksSection />
            <CTABanner onScrollToUpload={handleRouteToUpload} />
        </div>
    );
}