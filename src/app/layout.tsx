import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nazia Botanics — Botanical hair & scalp oils",
    template: "%s · Nazia Botanics",
  },
  description:
    "Small-batch, cold-infused botanical hair and scalp oils made in Lagos. Rosemary, ashwagandha, hibiscus and bhringraj — formulated to treat shedding at its source.",
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "Nazia", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Nazia Botanics",
    locale: "en_NG",
    images: ["/images/products/rl-square.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#faf3ec",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
