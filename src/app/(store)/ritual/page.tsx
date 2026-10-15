import type { Metadata } from "next";
import { withShare } from "@/lib/seo";
import { RitualPlayer } from "@/components/ritual/ritual-player";
import { getProducts } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = withShare({
  alternates: { canonical: "/ritual" },
  title: "The guided ritual",
  description: "How to use Nazia’s oils, guided step by step with ambient sound: the Rosemary Lavender hot oil treatment, the Nettle Pumpkin Seed moisture seal, and a 5-minute scalp massage.",
});

export default async function RitualPage() {
  const products = await getProducts();
  return <RitualPlayer products={products.map((p) => ({ slug: p.slug, name: p.name, cutout: p.cutout, tint: p.tint }))} />;
}
