import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/CTABannerAndFooter"; // Assuming you moved Footer here too

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body style={{ minHeight: "100vh", fontFamily: "'Raleway',sans-serif", margin: 0, paddingTop: 66 }}>
                {/* Navbar is global and stays at the top */}
                <Navbar />

                {/* Page content gets injected here */}
                <main>{children}</main>

                {/* Footer is global and stays at the bottom */}
                <Footer />
            </body>
        </html>
    );
}
