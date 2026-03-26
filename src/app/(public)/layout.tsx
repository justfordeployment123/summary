// src/app/(public)/layout.tsx
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/CTABannerAndFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ paddingTop: 66 }}>
            {/* The Navbar and Footer are now scoped ONLY to public pages */}
            <Navbar />
            
            <main>{children}</main>

            <Footer />
        </div>
    );
}