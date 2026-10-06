import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/rider.webmanifest",
  appleWebApp: { capable: true, title: "Rider", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#1f1511" };

export default function RiderRoot({ children }: { children: React.ReactNode }) {
  return children;
}
