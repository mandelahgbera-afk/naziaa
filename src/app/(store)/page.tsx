import { Hero } from "@/components/home/hero";
import { IngredientRail } from "@/components/home/ingredient-rail";
import { JournalTeaser, Pillars, ProductShowcase, RitualTeaser, SocialBand, Statement, TrustMarquee } from "@/components/home/sections";
import { INGREDIENTS } from "@/lib/catalog";
import { getHeroMedia, getProducts, getSettings } from "@/lib/data";
import { ARTICLES } from "@/lib/journal";

export const revalidate = 60;

export default async function Home() {
  const [products, media, settings] = await Promise.all([getProducts(), getHeroMedia(), getSettings()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nazia Botanics",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    sameAs: [settings.instagram, settings.tiktok],
    email: "hello@naziabotanics.com",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero media={media} products={products} />
      <TrustMarquee />
      <Statement />
      <ProductShowcase products={products} />
      <Pillars />
      <IngredientRail ingredients={INGREDIENTS} />
      <RitualTeaser />
      <JournalTeaser articles={ARTICLES} />
      <SocialBand instagram={settings.instagram} />
    </>
  );
}
