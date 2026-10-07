import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBag } from "@/components/cart/add-to-bag";
import { Pillars } from "@/components/home/sections";
import { Reveal } from "@/components/motion";
import { ProductDetail } from "@/components/product/product-detail";
import { formatNaira, PRODUCTS } from "@/lib/catalog";
import { getCopy, getProduct, getProducts } from "@/lib/data";
import { absoluteUrl } from "@/lib/backdrops";

// Admin edits and paid orders refresh these instantly; this is only the safety net
export const revalidate = 300;

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  return {
    title: `${p.name} — ${p.subtitle}`,
    description: p.description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: "website", url: `/products/${p.slug}`, title: `${p.name} · Nazia Botanics`, description: p.description },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [product, all, c] = await Promise.all([getProduct(slug), getProducts(), getCopy()]);
  if (!product) notFound();
  const others = all.filter((p) => p.slug !== product.slug);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const url = `${site}/products/${product.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      sku: product.slug,
      url,
      image: [product.square, product.cutout].filter(Boolean).map((src) => absoluteUrl(src, site)),
      brand: { "@type": "Brand", name: "Nazia Botanics" },
      offers: {
        "@type": "Offer",
        url,
        price: product.priceKobo / 100,
        priceCurrency: "NGN",
        itemCondition: "https://schema.org/NewCondition",
        availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "Nazia Botanics" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site || "/" },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${site}/shop` },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductDetail product={product} delivery={c["product.delivery"]} inside={c["product.inside"]} />
      <Pillars c={c} />
      {others.length > 0 && (
        <section className="wrap py-20 md:py-28" aria-labelledby="pair-title">
          <p className="eyebrow">Complete the ritual</p>
          <h2 id="pair-title" className="title mt-4">{c["product.pair"]}</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {others.map((p) => (
              <Reveal key={p.slug} className="flex items-center gap-6 rounded-[28px] bg-paper p-6">
                <Link href={`/products/${p.slug}`} className="relative h-48 w-36 shrink-0 overflow-hidden rounded-t-full rounded-b-2xl" style={{ background: `linear-gradient(180deg, ${p.tint[0]}, ${p.tint[1]})` }}>
                  <Image src={p.cutout} alt={p.name} fill sizes="144px" className="object-contain p-3" />
                </Link>
                <div>
                  <h3 className="font-serif text-3xl">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted">{p.subtitle}</p>
                  <p className="mt-4 font-serif text-xl">{formatNaira(p.priceKobo)}</p>
                  <AddToBag product={p} compact className="mt-5" />
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
