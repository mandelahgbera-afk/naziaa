"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { AmberField } from "@/components/hero/amber-field";
import { HeroVideo } from "@/components/hero/hero-video";
import { RiseWords } from "@/components/motion";
import type { Product } from "@/lib/catalog";
import type { HeroMedia } from "@/lib/data";

const silk = [0.22, 1, 0.36, 1] as const;

export function Hero({ media, products }: { media: HeroMedia; products: Product[] }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 900], [0, 180]);
  const contentO = useTransform(scrollY, [0, 520], [1, 0]);
  const mediaScale = useTransform(scrollY, [0, 900], [1, 1.12]);
  const bottlesY = useTransform(scrollY, [0, 900], [0, -120]);

  // Bottles lean gently toward the pointer
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [5, -5]), { stiffness: 60, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-8, 8]), { stiffness: 60, damping: 18 });
  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my, reduce]);

  const [front, back] = products;

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
        <motion.div className="relative z-10 md:col-span-7" style={reduce ? undefined : { y: contentY, opacity: contentO }}>
          <motion.p className="eyebrow text-paper/75" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: silk, delay: 0.2 }}>
            Botanical hair &amp; scalp oils · Lagos
          </motion.p>
          <h1 className="display mt-6 text-paper">
            <RiseWords text="Healthy hair starts from the root." italic={["root"]} immediate delay={0.35} stagger={0.09} />
          </h1>
          <motion.p
            className="mt-5 max-w-md text-[1rem] text-paper/80 md:mt-7 md:text-[1.08rem]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: silk, delay: 1.1 }}
          >
            Small-batch, cold-infused botanicals — formulated to treat shedding at its source, not the surface.
          </motion.p>
          <motion.div className="mt-8 flex flex-wrap gap-3 md:mt-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: silk, delay: 1.3 }}>
            <Link href="/shop" className="btn flex-1 bg-paper px-5 text-ink before:bg-honey sm:flex-none sm:px-8">Shop the oils</Link>
            <Link href="/ritual" className="btn btn-light flex-1 px-5 sm:flex-none sm:px-8">The ritual</Link>
          </motion.div>
        </motion.div>

        {front && back && (
          <motion.div
            className="pointer-events-none relative mx-auto mt-6 h-[30svh] w-[72%] max-w-[340px] md:col-span-5 md:mx-0 md:mt-0 md:h-[74vh] md:w-auto md:max-w-none"
            style={reduce ? undefined : { y: bottlesY, rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.8, ease: silk, delay: 0.5 }}
          >
            <div className="absolute inset-[12%] rounded-full bg-honey/40 blur-[90px]" />
            <div className="absolute top-[10%] left-[8%] h-[78%] w-[42%] animate-float [animation-delay:-3s]">
              <Image src={back.cutout} alt={back.name} fill priority sizes="(min-width: 768px) 18vw, 30vw" className="object-contain opacity-90 drop-shadow-[0_40px_40px_rgba(0,0,0,.45)]" />
            </div>
            <div className="absolute top-0 right-[6%] h-[96%] w-[48%] animate-float">
              <Image src={front.cutout} alt={front.name} fill priority sizes="(min-width: 768px) 22vw, 36vw" className="object-contain drop-shadow-[0_50px_50px_rgba(0,0,0,.5)]" />
            </div>
          </motion.div>
        )}
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
