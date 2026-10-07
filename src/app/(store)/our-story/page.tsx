import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Em } from "@/components/em";
import { Pillars, Title } from "@/components/home/sections";
import { Parallax, Reveal, ScrollInk } from "@/components/motion";
import { splitEmphasis } from "@/lib/content";
import { getCopy } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/our-story" },
  title: "Our story",
  description: "Nazia began as one woman’s search for a real answer to brittle, stuck hair — and became a small-batch botanical brand made in Lagos.",
};

export default async function OurStoryPage() {
  const c = await getCopy();
  return (
    <>
      <section className="wrap pt-28 pb-14 md:pt-48 md:pb-20">
        <p className="eyebrow">{c["story.eyebrow"]}</p>
        <h1 className="display mt-6 max-w-5xl">
          <Title text={c["story.title"]} immediate />
        </h1>
      </section>

      <section className="wrap grid gap-10 pb-16 md:grid-cols-12 md:gap-16 md:pb-28">
        <div className="md:col-span-5">
          <Parallax speed={0.08} className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-[36px] bg-gradient-to-b from-peach to-sand">
            <Image src="/images/products/rl-cutout.webp" alt="A bottle of Nazia Rosemary Lavender oil" fill sizes="(min-width: 768px) 38vw, 90vw" className="object-contain p-12" />
          </Parallax>
        </div>
        <div className="space-y-7 text-[1.15rem] leading-[1.85] text-ink-soft md:col-span-6 md:col-start-7 md:pt-12">
          <Reveal>
            <p className="font-serif text-3xl leading-snug text-ink"><Em text={c["story.lead"]} /></p>
          </Reveal>
          {(["story.p1", "story.p2", "story.p3"] as const).map((k, i) => (
            <Reveal key={k} delay={0.1 + i * 0.05}>
              <p><Em text={c[k]} /></p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="wrap py-24">
        <ScrollInk className="mx-auto max-w-5xl text-center font-serif text-[clamp(2rem,4.6vw,4rem)] leading-[1.1]" text={splitEmphasis(c["story.quote"]).plain} />
      </section>

      <Pillars c={c} />

      <section className="wrap py-20 text-center md:py-28">
        <p className="eyebrow">Join us</p>
        <h2 className="title mt-4"><Em text={c["story.cta.title"]} /></h2>
        <p className="lede mx-auto mt-6"><Em text={c["story.cta.body"]} /></p>
        <Link href="/shop" className="btn btn-dark mt-10">Shop the ritual</Link>
      </section>
    </>
  );
}
