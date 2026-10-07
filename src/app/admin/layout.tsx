import type { Metadata, Viewport } from "next";
import { adminHref } from "@/lib/admin-path";

export const metadata: Metadata = {
  manifest: adminHref("/app-manifest"),
  appleWebApp: { capable: true, title: "Studio", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#1f1511" };

export default function StudioRoot({ children }: { children: React.ReactNode }) {
  return children;
}
