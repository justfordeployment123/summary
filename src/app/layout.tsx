import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

// Configure the Raleway font
const raleway = Raleway({
    subsets: ["latin"],
    weight: ["400", "700"], // Regular and Bold per the design guidelines
    variable: "--font-raleway",
    display: "swap",
});

// Set the metadata for the browser tab using the brand tagline
export const metadata: Metadata = {
    title: "ExplainMyLetter",
    description: "Clarity. Confidence. Next Steps.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${raleway.variable} font-sans bg-white text-brand-dark antialiased`}>
                {/* A simple starter Navbar to see the colors in action */}
                <header className="w-full p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-xl tracking-tight">ExplainMyLetter</span>
                    </div>
                </header>

                <main className="min-h-screen">{children}</main>
            </body>
        </html>
    );
}
