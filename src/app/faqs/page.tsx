"use client";

import { useRouter } from "next/navigation";
import { FAQSection, CTABanner } from "@/components/home";

export default function FAQsPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ paddingTop: "40px", paddingBottom: "40px" }}>
            <FAQSection />
            <CTABanner onScrollToUpload={handleRouteToUpload} />
        </div>
    );
}
