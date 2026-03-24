import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    serverExternalPackages: ["pdf-parse-new", "pdfkit"], // Add this line
};

export default nextConfig;
