import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "canvas",
    "pdf-parse",
    "tesseract.js",
    "mammoth",
  ],
};

export default nextConfig;
