import type { Metadata } from "next";
import { IngredientRail } from "@/components/home/ingredient-rail";
import { ProductShowcase, RitualTeaser, TrustMarquee } from "@/components/home/sections";
import { Em } from "@/components/em";
import { Title } from "@/components/home/sections";
import { ingredientsWithCopy } from "@/lib/catalog";
import { getCopy, getProducts } from "@/lib/data";

// Admin edits and paid orders refresh these instantly; this is only the safety net
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/shop" },
  title: "Shop the oils",
  description: "Two small-batch, cold-infused botanical hair and scalp oils, handmade in Lagos.",
};

export default async function ShopPage() {
  const [products, c] = await Promise.all([getProducts(), getCopy()]);
  return (
    <>
      <section className="wrap pt-28 pb-12 md:pt-48 md:pb-16">
        <p className="eyebrow">{c["shop.eyebrow"]}</p>
        <h1 className="display mt-6 max-w-4xl">
          <Title text={c["shop.title"]} immediate />
        </h1>
        <p className="lede mt-8"><Em text={c["shop.lede"]} /></p>
      </section>
      <TrustMarquee c={c} />
      <div className="pt-20">
        <ProductShowcase products={products} c={c} />
      </div>
      <IngredientRail ingredients={ingredientsWithCopy(c)} eyebrow={c["home.ingredients.eyebrow"]} title={c["home.ingredients.title"]} />
      <RitualTeaser c={c} />
    </>
  );
}
