"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AddToBag } from "@/components/cart/add-to-bag";
import { QtyStepper } from "@/components/cart/cart-drawer";
import { DropIcon, LeafIcon, PlusIcon, RiderIcon } from "@/components/icons";
import { RiseWords } from "@/components/motion";
import { formatNaira, type Product } from "@/lib/catalog";

const silk = [0.22, 1, 0.36, 1] as const;

export function ProductDetail({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"cutout" | "square">("cutout");
  const buyRow = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  // the sticky buy bar appears once the main “Add to bag” scrolls out of view
  useEffect(() => {
    const el = buyRow.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="wrap grid gap-8 pt-24 pb-16 md:grid-cols-12 md:gap-10 md:pt-40 md:pb-24">
      {/* gallery */}
      <div className="md:col-span-7">
        <div className="md:sticky md:top-28">
          <div
            className="relative aspect-[5/6] overflow-hidden rounded-t-[999px] rounded-b-[36px] md:aspect-[4/5]"
            style={{ background: `linear-gradient(180deg, ${product.tint[0]}, ${product.tint[1]})` }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: silk }}
              >
                {view === "cutout" ? (
                  <div className="absolute inset-x-0 top-[9%] bottom-[9%] animate-float">
                    <Image src={product.cutout} alt={`${product.name} ${product.sizeMl}ml bottle`} fill priority sizes="(min-width: 768px) 55vw, 95vw" className="object-contain drop-shadow-[0_40px_40px_rgba(58,42,34,.28)]" />
                  </div>
                ) : (
                  <Image src={product.square} alt={`${product.name} photographed on a warm backdrop`} fill sizes="(min-width: 768px) 55vw, 95vw" className="object-cover" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-4 flex gap-3" role="tablist" aria-label="Product images">
            {(["cutout", "square"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`relative h-20 w-16 overflow-hidden rounded-xl border transition ${view === v ? "border-ink" : "border-transparent opacity-60 hover:opacity-100"}`}
                style={{ background: `linear-gradient(180deg, ${product.tint[0]}, ${product.tint[1]})` }}
              >
                <Image src={v === "cutout" ? product.cutout : product.square} alt="" fill sizes="64px" className={v === "cutout" ? "object-contain p-1.5" : "object-cover"} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* details */}
      <div className="md:col-span-5 md:pt-10">
        <nav aria-label="Breadcrumb" className="eyebrow">
          <Link href="/shop" className="link-underline">Shop</Link> <span className="mx-2">/</span> {product.name}
        </nav>
        <h1 className="mt-6 font-serif text-[clamp(3rem,6vw,5.4rem)] leading-[0.95] tracking-[-0.02em]">
          <RiseWords text={product.name} immediate />
        </h1>
        <p className="mt-3 text-muted">{product.subtitle}</p>
        <p className="mt-6 font-serif text-2xl italic text-ink-soft">{product.tagline}</p>

        <div className="mt-8 flex items-baseline gap-4">
          <p className="font-serif text-4xl">{formatNaira(product.priceKobo)}</p>
          <p className="text-sm text-muted">{product.sizeMl}ml</p>
        </div>

        {product.batch && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-xs tracking-[0.14em] text-ink-soft uppercase">
            <DropIcon size={14} /> Batch {product.batch.code} · infused {new Date(product.batch.infusedOn).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
          </p>
        )}

        <p className="mt-8 text-[1.05rem] text-ink-soft">{product.description}</p>

        <ul className="mt-8 grid grid-cols-2 gap-3">
          {product.benefits.map((b) => (
            <li key={b.label} className="rounded-2xl bg-paper p-4">
              <LeafIcon size={18} className="text-sage" />
              <p className="mt-3 font-serif text-xl leading-tight">{b.label}</p>
              <p className="mt-1 text-xs tracking-[0.16em] text-muted uppercase">{b.source}</p>
            </li>
          ))}
        </ul>

        <div ref={buyRow} className="mt-10 flex flex-wrap items-center gap-4">
          <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} label={product.name} />
          <AddToBag product={product} qty={qty} className="flex-1" />
        </div>

        <p className="mt-5 flex items-center gap-3 text-sm text-ink-soft">
          <RiderIcon size={20} className="shrink-0 text-amber" />
          Lagos orders arrive with our own riders; nationwide delivery from Lagos.
        </p>

        <div className="mt-10 divide-y divide-line border-y border-line">
          <Accordion title="The 5-minute ritual" defaultOpen>
            <ol className="space-y-3">
              {product.howToUse.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-serif text-lg text-muted italic">0{i + 1}</span>
                  <span className="text-ink-soft">{s}</span>
                </li>
              ))}
            </ol>
            <Link href="/ritual" className="link-underline mt-5 inline-block text-[0.72rem] tracking-[0.2em] uppercase">Open the guided ritual</Link>
          </Accordion>
          <Accordion title="What’s inside">
            <p className="text-ink-soft">
              Botanicals only — no fillers, no synthetic fragrance. Read about each one in the{" "}
              <Link href="/ingredients" className="underline decoration-line underline-offset-4 hover:decoration-ink">ingredient library</Link>.
            </p>
          </Accordion>
          <Accordion title="Good to know">
            <ul className="space-y-2 text-ink-soft">
              {product.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </Accordion>
        </div>
      </div>
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-x-3 bottom-tabbar z-30 mb-2 flex items-center gap-3 rounded-[22px] bg-darker/95 p-2.5 pl-3 text-paper shadow-float backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-6 md:mb-0 md:w-[420px]"
          >
            <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-xl" style={{ background: `linear-gradient(180deg, ${product.tint[0]}, ${product.tint[1]})` }}>
              <Image src={product.cutout} alt="" fill sizes="40px" className="object-contain p-1" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-lg leading-tight">{product.name}</span>
              <span className="text-xs text-paper/60">{formatNaira(product.priceKobo * qty)}{qty > 1 ? ` · ${qty} bottles` : ""}</span>
            </span>
            <AddToBag product={product} qty={qty} compact className="min-w-0 bg-paper px-5 py-3 text-ink before:bg-honey" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between py-5 text-left">
        <span className="font-serif text-2xl">{title}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.5, ease: silk }}>
          <PlusIcon size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.6, ease: silk }} className="overflow-hidden">
            <div className="pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
