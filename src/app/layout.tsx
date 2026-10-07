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
  applicationName: "Nazia Botanics",
  keywords: [
    "botanical hair oil",
    "hair oil Nigeria",
    "rosemary hair oil Lagos",
    "scalp oil",
    "hair growth oil",
    "hair shedding",
    "ashwagandha for hair",
    "Ayurvedic hair care",
    "small batch hair oil",
    "Nazia Botanics",
  ],
  authors: [{ name: "Nazia Botanics" }],
  creator: "Nazia Botanics",
  publisher: "Nazia Botanics",
  category: "beauty",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  twitter: { card: "summary_large_image" },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "Nazia", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Nazia Botanics",
    locale: "en_NG",
    title: "Nazia Botanics — Botanical hair & scalp oils",
    description: "Small-batch, cold-infused botanical hair and scalp oils made in Lagos — formulated to treat shedding at its source.",
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
