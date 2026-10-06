import type { Metadata } from "next";
import { IngredientRail } from "@/components/home/ingredient-rail";
import { ProductShowcase, RitualTeaser, TrustMarquee } from "@/components/home/sections";
import { RiseWords } from "@/components/motion";
import { INGREDIENTS } from "@/lib/catalog";
import { getProducts } from "@/lib/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop the oils",
  description: "Two small-batch, cold-infused botanical hair and scalp oils, handmade in Lagos.",
};

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <>
      <section className="wrap pt-28 pb-12 md:pt-48 md:pb-16">
        <p className="eyebrow">The shop</p>
        <h1 className="display mt-6 max-w-4xl">
          <RiseWords text="Treat shedding at its source." italic={["source."]} immediate />
        </h1>
        <p className="lede mt-8">Small-batch, cold-infused botanicals — formulated to treat shedding at its source, not the surface.</p>
      </section>
      <TrustMarquee />
      <div className="pt-20">
        <ProductShowcase products={products} />
      </div>
      <IngredientRail ingredients={INGREDIENTS} />
      <RitualTeaser />
    </>
  );
}
