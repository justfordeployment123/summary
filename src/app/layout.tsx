// src/app/layout.tsx
import "./globals.css"; // Add this line! (adjust path if your css is named differently)
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body style={{ minHeight: "100vh", fontFamily: "'Raleway',sans-serif", margin: 0 }}>
                {/* No Navbar or Footer here! Just pass the children through. */}
                {children}
            </body>
        </html>
    );
}