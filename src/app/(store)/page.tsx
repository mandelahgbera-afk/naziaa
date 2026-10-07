import { Hero } from "@/components/home/hero";
import { IngredientRail } from "@/components/home/ingredient-rail";
import { JournalTeaser, Pillars, ProductShowcase, RitualTeaser, SocialBand, Statement, TrustMarquee } from "@/components/home/sections";
import { ingredientsWithCopy } from "@/lib/catalog";
import { getCopy, getHeroMedia, getProducts, getSettings } from "@/lib/data";
import { ARTICLES } from "@/lib/journal";

// Admin edits and paid orders refresh these instantly; this is only the safety net
export const revalidate = 300;

export default async function Home() {
  const [products, media, settings, c] = await Promise.all([getProducts(), getHeroMedia(), getSettings(), getCopy()]);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${site}/#organization`,
      name: "Nazia Botanics",
      url: site,
      logo: `${site}/pwa-icon/512`,
      image: `${site}/opengraph-image`,
      description: "Small-batch, cold-infused botanical hair and scalp oils made in Lagos.",
      email: settings.contactEmail,
      address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
      sameAs: [settings.instagram, settings.tiktok].filter(Boolean),
      contactPoint: [
        { "@type": "ContactPoint", contactType: "customer service", email: settings.contactEmail, areaServed: "NG", availableLanguage: ["en"] },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${site}/#website`,
      name: "Nazia Botanics",
      url: site,
      publisher: { "@id": `${site}/#organization` },
      inLanguage: "en-NG",
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero media={media} products={products} c={c} />
      <TrustMarquee c={c} />
      <Statement c={c} />
      <ProductShowcase products={products} c={c} />
      <Pillars c={c} />
      <IngredientRail ingredients={ingredientsWithCopy(c)} eyebrow={c["home.ingredients.eyebrow"]} title={c["home.ingredients.title"]} />
      <RitualTeaser c={c} />
      <JournalTeaser articles={ARTICLES} c={c} />
      <SocialBand instagram={settings.instagram} tiktok={settings.tiktok} c={c} />
    </>
  );
}
