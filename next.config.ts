import type { NextConfig } from "next";

/* Sent with every page. The policy blocks being framed by other sites (clickjacking), plugins, and
   forms or a <base> pointing elsewhere; camera is for riders' delivery proof, location for their tracking. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(self), usb=(), browsing-topics=()" },
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // automatic memoisation: fewer re-renders on every interaction
  reactCompiler: true,
  experimental: {
    // CSS in the first HTML response: no render-blocking stylesheet request
    inlineCss: true,
    optimizePackageImports: ["motion"],
  },
  images: {
    qualities: [60, 75, 90],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "image.mux.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
