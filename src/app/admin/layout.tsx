import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/studio.webmanifest",
  appleWebApp: { capable: true, title: "Studio", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#1f1511" };

export default function StudioRoot({ children }: { children: React.ReactNode }) {
  return children;
}
