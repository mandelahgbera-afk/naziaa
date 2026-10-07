"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/icons";
import { cartCount, cartSubtotal, useCart, MAX_QTY } from "@/lib/cart";
import { formatNaira, type Product } from "@/lib/catalog";
import { haptic, useIsMobile } from "@/lib/use-media";
import { useCopy } from "@/components/copy";

const silk = [0.22, 1, 0.36, 1] as const;

export function CartDrawer({ products, freeDeliveryThresholdKobo }: { products: Product[]; freeDeliveryThresholdKobo: number | null }) {
  const { lines, open, setOpen, setQty, remove, add, pulse, giftWrap, giftNote, setGift } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const [celebrate, setCelebrate] = useState(false);
  const lastPulse = useRef(pulse);
  const mobile = useIsMobile();
  const c = useCopy();
  const drag = useDragControls();
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) setOpen(false);
  };

  // Drop cheers for a moment after every add
  useEffect(() => {
    if (pulse === lastPulse.current) return;
    lastPulse.current = pulse;
    setCelebrate(true);
    haptic(18);
    const t = window.setTimeout(() => setCelebrate(false), 2600);
    return () => window.clearTimeout(t);
  }, [pulse]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a,button,input,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open, setOpen]);

  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);
  const remaining = freeDeliveryThresholdKobo ? Math.max(0, freeDeliveryThresholdKobo - subtotal) : null;
  const progress = freeDeliveryThresholdKobo ? Math.min(1, subtotal / freeDeliveryThresholdKobo) : 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-darker/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
            data-lenis-prevent
            className={
              mobile
                ? "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[28px] bg-paper outline-none shadow-[0_-20px_60px_-20px_rgba(31,21,17,.45)]"
                : "absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-paper outline-none sm:rounded-l-[28px] sm:shadow-float"
            }
            initial={mobile ? { y: "100%" } : { x: "100%" }}
            animate={mobile ? { y: 0 } : { x: 0 }}
            exit={mobile ? { y: "100%" } : { x: "100%" }}
            transition={mobile ? { type: "spring", stiffness: 380, damping: 38 } : { duration: 0.8, ease: silk }}
            drag={mobile ? "y" : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {mobile && (
              <div className="cursor-grab touch-none pt-3 pb-1" onPointerDown={(e) => drag.start(e)} aria-hidden>
                <div className="mx-auto h-1.5 w-11 rounded-full bg-ink/15" />
              </div>
            )}
            <header className="flex items-center justify-between px-6 pt-3 pb-4 sm:px-8 md:pt-6" onPointerDown={(e) => mobile && drag.start(e)}>
              <h2 className="font-serif text-3xl">
                Your bag {count > 0 && <span className="align-top text-sm font-sans text-muted">({count})</span>}
              </h2>
              <button type="button" className="-mr-2 rounded-full p-2 transition hover:bg-cream-deep" onClick={() => setOpen(false)} aria-label="Close bag">
                <CloseIcon />
              </button>
            </header>

            {freeDeliveryThresholdKobo && count > 0 && (
              <div className="px-6 pb-4 sm:px-8">
                <p className="text-sm text-ink-soft">
                  {remaining ? <>You’re <strong className="font-normal text-amber">{formatNaira(remaining)}</strong> away from free delivery</> : "Your delivery is on us."}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-cream-deep">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-amber to-honey" animate={{ width: `${progress * 100}%` }} transition={{ duration: 1, ease: silk }} />
                </div>
              </div>
            )}

            <AnimatePresence>
              {celebrate && count > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-6 sm:px-8"
                >
                  <div className="mb-3 flex items-center gap-3 rounded-2xl bg-cream-deep px-4 py-2">
                    <DropMascot mood="happy" size={44} label="" />
                    <p className="text-sm text-ink-soft">{c["bag.added"]}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8">
              {count === 0 ? (
                <EmptyBag products={products} onAdd={(p) => add({ slug: p.slug, name: p.name, subtitle: p.subtitle, priceKobo: p.priceKobo, image: p.cutout, accent: p.accent })} />
              ) : (
                <ul className="divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.slug}
                        layout
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40, height: 0 }}
                        transition={{ duration: 0.6, ease: silk }}
                        className="flex gap-4 py-5"
                      >
                        <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl" style={{ background: `linear-gradient(180deg, ${l.accent}22, ${l.accent}44)` }}>
                          <Image src={l.image} alt={l.name} fill sizes="96px" className="object-contain p-2" />
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-serif text-xl leading-tight">{l.name}</p>
                              <p className="text-xs text-muted">{l.subtitle}</p>
                            </div>
                            <p className="text-sm">{formatNaira(l.priceKobo * l.qty)}</p>
                          </div>
                          <div className="mt-auto flex items-center justify-between">
                            <QtyStepper value={l.qty} onChange={(q) => setQty(l.slug, q)} label={l.name} />
                            <button type="button" onClick={() => remove(l.slug)} className="link-underline text-xs tracking-[0.18em] text-muted uppercase">
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {count > 0 && (
              <footer className="border-t border-line px-6 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-8">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
                  <input type="checkbox" checked={giftWrap} onChange={(e) => setGift(e.target.checked)} className="size-4 accent-amber" />
                  Gift-wrap this order and add a handwritten note
                </label>
                <AnimatePresence>
                  {giftWrap && (
                    <motion.textarea
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 76, opacity: 1, marginTop: 12 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      value={giftNote}
                      maxLength={240}
                      onChange={(e) => setGift(true, e.target.value)}
                      placeholder="Your note…"
                      className="w-full resize-none rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none focus:border-amber"
                    />
                  )}
                </AnimatePresence>
                <div className="mt-5 flex items-baseline justify-between">
                  <span className="eyebrow">Subtotal</span>
                  <span className="font-serif text-2xl">{formatNaira(subtotal)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{c["bag.delivery"]}</p>
                <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-dark mt-5 w-full">
                  Checkout
                </Link>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function QtyStepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className="p-2 text-ink-soft transition hover:text-ink disabled:opacity-30" onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <MinusIcon size={16} />
      </button>
      <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="p-2 text-ink-soft transition hover:text-ink disabled:opacity-30" disabled={value >= MAX_QTY} onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

function EmptyBag({ products, onAdd }: { products: Product[]; onAdd: (p: Product) => void }) {
  const c = useCopy();
  return (
    <div className="flex h-full flex-col items-center pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center md:pt-6">
      <DropMascot mood="waiting" size={150} label="Drop is waiting for something to hold" />
      <h3 className="mt-6 font-serif text-3xl">{c["bag.empty.title"]}</h3>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">
        {c["bag.empty.body"]}
      </p>
      <div className="mt-8 grid w-full grid-cols-2 gap-3">
        {products.slice(0, 2).map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => onAdd(p)}
            className="group relative overflow-hidden rounded-2xl p-3 pt-4 text-left transition duration-500 hover:-translate-y-1"
            style={{ background: `linear-gradient(180deg, ${p.tint[0]}, ${p.tint[1]})` }}
          >
            <div className="relative mx-auto h-32 w-full">
              <Image src={p.cutout} alt="" fill sizes="160px" className="object-contain transition duration-700 group-hover:scale-105" />
            </div>
            <p className="mt-2 font-serif text-lg leading-tight">{p.name}</p>
            <p className="mt-1 flex items-center justify-between text-xs text-ink-soft">
              {formatNaira(p.priceKobo)}
              <span className="grid size-7 place-items-center rounded-full bg-ink text-paper transition group-hover:bg-amber">
                <PlusIcon size={14} />
              </span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
