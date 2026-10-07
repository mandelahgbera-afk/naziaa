import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
