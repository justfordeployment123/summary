"use client";

import { useRouter } from "next/navigation";
import { ExamplesSection, CTABanner } from "@/components/home";

export default function ExamplesPage() {
    const router = useRouter();

    const handleRouteToUpload = () => {
        router.push("/#upload-section");
    };

    return (
        <div style={{ paddingTop: "40px", paddingBottom: "40px" }}>
            <ExamplesSection onScrollToUpload={handleRouteToUpload} />
        </div>
    );
}
