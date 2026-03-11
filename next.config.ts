import type { NextConfig } from "next";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// realtime uses websocket — needs wss:// in addition to https://
const supabaseWss = supabaseUrl.replace(/^https?:\/\//, "wss://");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      `connect-src 'self' ${supabaseUrl} ${supabaseWss}`,
      "font-src 'self'",
      "frame-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const workspaceRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
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
