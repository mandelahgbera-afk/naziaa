"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { AmberField } from "@/components/hero/amber-field";
import { HeroVideo } from "@/components/hero/hero-video";
import { RiseWords } from "@/components/motion";
import type { HeroMedia } from "@/lib/data";
import { splitEmphasis, type Copy } from "@/lib/content";

export function Hero({ media, c }: { media: HeroMedia; c: Copy }) {
  const headline = splitEmphasis(c["home.hero.headline"]);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 900], [0, 180]);
  const contentO = useTransform(scrollY, [0, 520], [1, 0]);
  const mediaScale = useTransform(scrollY, [0, 900], [1, 1.12]);

  return (
    <section className="relative h-[100svh] min-h-[680px] overflow-hidden bg-darker" aria-label="Introduction">
      <motion.div className="absolute inset-0" style={reduce ? undefined : { scale: mediaScale }}>
        {media ? <HeroVideo media={media} className="h-full w-full" /> : <AmberField className="h-full w-full" />}
      </motion.div>

      {/* tint + header shade + the melt into the cream page */}
      <div className="pointer-events-none absolute inset-0 bg-darker" style={{ opacity: media ? media.tint : 0.12 }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-darker/55 to-transparent" />
      {media ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-b from-transparent via-[#e7c49a]/45 to-cream" />
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[8%] bg-gradient-to-b from-transparent to-cream" />
      )}

      <div className="wrap relative grid h-full grid-cols-1 content-center pt-24 md:grid-cols-12 md:content-normal md:items-center">
        <motion.div className="relative z-10 md:col-span-7 lg:col-span-6" style={reduce ? undefined : { y: contentY, opacity: contentO }}>
          <p className="eyebrow fade-up text-paper/75" style={{ ["--d" as string]: "0.2s" }}>
            {c["home.hero.eyebrow"]}
          </p>
          <h1 className="display mt-6 text-paper">
            <RiseWords text={headline.plain} italic={headline.italic} immediate delay={0.35} stagger={0.09} />
          </h1>
          <p className="fade-up mt-5 max-w-md text-[1rem] text-paper/80 md:mt-7 md:text-[1.08rem]" style={{ ["--d" as string]: "0.9s" }}>
            {splitEmphasis(c["home.hero.intro"]).plain}
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-3 md:mt-10" style={{ ["--d" as string]: "1.1s" }}>
            <Link href="/shop" className="btn flex-1 bg-paper px-5 text-ink before:bg-honey sm:flex-none sm:px-8">{c["home.hero.cta1"]}</Link>
            <Link href="/ritual" className="btn btn-light flex-1 px-5 sm:flex-none sm:px-8">{c["home.hero.cta2"]}</Link>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-ink-soft md:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        aria-hidden
      >
        <span className="text-[0.62rem] tracking-[0.4em] uppercase">Scroll</span>
        <span className="relative block h-12 w-px overflow-hidden bg-ink/15">
          <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-ink/60" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
        </span>
      </motion.div>
    </section>
  );
}
