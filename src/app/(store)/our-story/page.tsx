import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pillars } from "@/components/home/sections";
import { Parallax, Reveal, RiseWords, ScrollInk } from "@/components/motion";

export const metadata: Metadata = {
  alternates: { canonical: "/our-story" },
  title: "Our story",
  description: "Nazia began as one woman’s search for a real answer to brittle, stuck hair — and became a small-batch botanical brand made in Lagos.",
};

export default function OurStoryPage() {
  return (
    <>
      <section className="wrap pt-28 pb-14 md:pt-48 md:pb-20">
        <p className="eyebrow">My story</p>
        <h1 className="display mt-6 max-w-5xl">
          <RiseWords text="Rooted in care, grown from calm." italic={["calm."]} immediate />
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
            <p className="font-serif text-3xl leading-snug text-ink">
              For years, my hair was a constant source of frustration — brittle, dry, and stuck at a single length.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p>After endless cycles of ‘miracle’ products and quick fixes, I realized I needed to stop treating the symptoms and start tending to the roots.</p>
          </Reveal>
          <Reveal delay={0.15}>
            <p>
              I decided to create the formula myself. By stripping away harsh chemicals and embracing powerful, time-tested botanicals like Ashwagandha and Rosemary, I unlocked a 5,000-year-old tradition of holistic healing. What began as a personal mission to restore my own hair has grown into NAZIA — a brand dedicated to helping you reclaim your confidence.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p>We don’t just sell hair oil; we provide thoughtful, handmade, plant-powered nourishment designed to make your hair thrive.</p>
          </Reveal>
        </div>
      </section>

      <section className="wrap py-24">
        <ScrollInk
          className="mx-auto max-w-5xl text-center font-serif text-[clamp(2rem,4.6vw,4rem)] leading-[1.1]"
          text="At NAZIA, we believe that true confidence is the most natural thing you can wear."
        />
      </section>

      <Pillars />

      <section className="wrap py-20 text-center md:py-28">
        <p className="eyebrow">Join us</p>
        <h2 className="title mt-4">Begin your own ritual.</h2>
        <p className="lede mx-auto mt-6">Every bottle is blended in small batches and shipped with the 5-minute ritual guide.</p>
        <Link href="/shop" className="btn btn-dark mt-10">Shop the ritual</Link>
      </section>
    </>
  );
}
