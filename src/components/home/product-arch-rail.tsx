"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { AddToBag } from "@/components/cart/add-to-bag";
import { DropDots, useSnapIndex } from "@/components/mobile/swipe";
import { formatNaira, type Product } from "@/lib/catalog";

const MotionLink = motion.create(Link);

/* Phones: the oils as a row of arched “windows”. Swiping turns them like pages:
   the centred arch rises to full size while its neighbours tilt back, and the
   bottle drifts against the swipe for depth. One shared detail panel below
   crossfades to whichever oil is centred, so the section stays one screen tall. */
export function ProductArchRail({ products }: { products: Product[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const { index, goTo } = useSnapIndex(rail, products.length);
  const reduce = useReducedMotion();
  const p = products[index] ?? products[0];

  // a one-time nudge so people discover they can swipe
  useEffect(() => {
    const el = rail.current;
    if (!el || reduce) return;
    let seen = false;
    try { seen = sessionStorage.getItem("nz-swipe-hint") === "1"; } catch {}
    if (seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      window.setTimeout(() => {
        el.scrollBy({ left: 70, behavior: "smooth" });
        window.setTimeout(() => el.scrollBy({ left: -70, behavior: "smooth" }), 650);
      }, 700);
      try { sessionStorage.setItem("nz-swipe-hint", "1"); } catch {}
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div className="-mx-4 md:hidden">
      <div
        ref={rail}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[17vw] pt-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Swipe through the oils"
      >
        {products.map((prod, i) => (
          <ArchCard key={prod.slug} product={prod} rail={rail} active={i === index} priority={i === 0} />
        ))}
      </div>

      <div className="mt-3">
        <DropDots count={products.length} index={index} onPick={goTo} labels={products.map((x) => x.name)} />
      </div>

      <div className="relative mt-4 min-h-[15rem] px-4" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <p className="eyebrow">{formatNaira(p.priceKobo)} · {p.sizeMl}ml · small batch</p>
            <h3 className="mt-2 font-serif text-[2.4rem] leading-none">{p.name}</h3>
            <p className="mx-auto mt-3 max-w-[21rem] font-serif text-lg italic text-ink-soft">{p.tagline}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {p.benefits.map((b) => (
                <span key={b.label} className="rounded-full border border-line px-3 py-1 text-[0.66rem] tracking-[0.14em] text-ink-soft uppercase">
                  {b.label}
                </span>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <AddToBag product={p} compact className="px-6" />
              <Link href={`/products/${p.slug}`} className="pressable rounded-full border border-ink/20 px-5 py-[0.95rem] text-[0.72rem] tracking-[0.2em] uppercase">
                Details
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ArchCard({ product: p, rail, active, priority }: { product: Product; rail: React.RefObject<HTMLDivElement | null>; active: boolean; priority: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  // 0 → entering from the right, 0.5 → centred, 1 → leaving to the left
  const { scrollXProgress } = useScroll({ container: rail, target: ref, axis: "x", offset: ["start end", "end start"] });
  const scale = useTransform(scrollXProgress, [0, 0.5, 1], [0.86, 1, 0.86]);
  const rotateY = useTransform(scrollXProgress, [0, 0.5, 1], [-16, 0, 16]);
  const bottleX = useTransform(scrollXProgress, [0, 0.5, 1], ["22%", "0%", "-22%"]);
  const glow = useTransform(scrollXProgress, [0.25, 0.5, 0.75], [0, 1, 0]);

  return (
    <MotionLink
      ref={ref}
      href={`/products/${p.slug}`}
      data-snap
      aria-label={`${p.name} — ${formatNaira(p.priceKobo)}`}
      aria-current={active ? "true" : undefined}
      className="relative block aspect-[4/5] w-[66vw] shrink-0 snap-center overflow-hidden rounded-t-[999px] rounded-b-[30px]"
      style={reduce ? { background: `linear-gradient(180deg, ${p.tint[0]}, ${p.tint[1]})` } : { scale, rotateY, transformPerspective: 900, background: `linear-gradient(180deg, ${p.tint[0]}, ${p.tint[1]})` }}
    >
      <motion.div className="absolute inset-[18%] rounded-full bg-paper/70 blur-3xl" style={{ opacity: reduce ? 1 : glow }} />
      <div className="absolute inset-x-[24%] bottom-[9%] h-5 rounded-[50%] bg-ink/25 blur-lg" />
      <motion.div className="absolute inset-x-0 top-[8%] bottom-[10%]" style={reduce ? undefined : { x: bottleX }}>
        <Image src={p.cutout} alt={p.name} fill loading={priority ? "eager" : "lazy"} sizes="66vw" className="object-contain drop-shadow-[0_24px_24px_rgba(58,42,34,.28)]" />
      </motion.div>
      <span className="absolute top-[13%] left-1/2 -translate-x-1/2 rounded-full bg-paper/80 px-3 py-1 text-[0.6rem] tracking-[0.2em] text-ink uppercase backdrop-blur">
        {p.benefits[0]?.source ?? "Botanical"}
      </span>
    </MotionLink>
  );
}
