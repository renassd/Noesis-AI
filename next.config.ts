import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent the app from being embedded in iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing a response away from the declared content-type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send origin (no path) in the Referer header to external sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features this app never uses
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Enforce HTTPS for 1 year (only applied in production via the secure flag on cookies,
  // but sending the header helps browsers upgrade insecure requests)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "canvas",
    "pdf-parse",
    "tesseract.js",
    "mammoth",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
