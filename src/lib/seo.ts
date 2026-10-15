import type { Metadata } from "next";

const SITE = "Nazia Botanics";

/** Gives a page its own share preview (WhatsApp, TikTok, Instagram, X, iMessage):
    the page's title, description and address instead of the homepage's.
    The share image still comes from the opengraph-image files. */
export function withShare(meta: Metadata): Metadata {
  const title = typeof meta.title === "string" ? `${meta.title} · ${SITE}` : undefined;
  const description = meta.description ?? undefined;
  const url = typeof meta.alternates?.canonical === "string" ? meta.alternates.canonical : undefined;
  return {
    ...meta,
    openGraph: { type: "website", siteName: SITE, locale: "en_NG", ...(url ? { url } : {}), ...(title ? { title } : {}), ...(description ? { description } : {}), ...meta.openGraph },
    twitter: { card: "summary_large_image", ...(title ? { title } : {}), ...(description ? { description } : {}), ...meta.twitter },
  };
}
