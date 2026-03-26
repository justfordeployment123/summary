"use client";

import { useRouter } from "next/navigation";
import { WhyChooseUsSection, CTABanner } from "@/components/home";

export default function WhyChooseUsPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ paddingTop: "40px", paddingBottom: "40px" }}>
            <WhyChooseUsSection />
            <CTABanner onScrollToUpload={handleRouteToUpload} />
        </div>
    );
}
