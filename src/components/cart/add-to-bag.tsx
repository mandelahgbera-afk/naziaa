"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";
import { formatNaira, type Product } from "@/lib/catalog";

type Phase = "idle" | "pouring" | "added";

export function AddToBag({ product, qty = 1, className = "", compact = false }: { product: Product; qty?: number; className?: string; compact?: boolean }) {
  const add = useCart((s) => s.add);
  const [phase, setPhase] = useState<Phase>("idle");

  if (!product.inStock) {
    return (
      <button type="button" disabled className={`btn btn-ghost cursor-not-allowed opacity-50 ${className}`}>
        Between batches
      </button>
    );
  }

  const onClick = () => {
    if (phase !== "idle") return;
    setPhase("pouring");
    window.setTimeout(() => {
      add({ slug: product.slug, name: product.name, subtitle: product.subtitle, priceKobo: product.priceKobo, image: product.cutout, accent: product.accent }, qty);
      setPhase("added");
      window.setTimeout(() => setPhase("idle"), 1800);
    }, 650);
  };

  return (
    <button type="button" onClick={onClick} className={`btn btn-dark min-w-[13rem] ${className}`} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {phase === "idle" && (
          <motion.span key="idle" className="flex items-center gap-3" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}>
            Add to bag{!compact && <span className="opacity-60">— {formatNaira(product.priceKobo * qty)}</span>}
          </motion.span>
        )}
        {phase === "pouring" && (
          <motion.span key="pour" className="relative flex h-5 w-10 items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.svg viewBox="0 0 12 16" className="absolute top-[-10px] h-3.5 w-3" initial={{ y: -8, scaleY: 0.6 }} animate={{ y: 14, scaleY: [0.6, 1.25, 0.8] }} transition={{ duration: 0.55, ease: "easeIn" }}>
              <path d="M6 0s6 6.4 6 10a6 6 0 0 1-12 0C0 6.4 6 0 6 0Z" fill="var(--color-honey)" />
            </motion.svg>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M5.2 9h13.6l-.9 10a1.4 1.4 0 0 1-1.4 1.2H7.5A1.4 1.4 0 0 1 6.1 19Z" /><path d="M9 9V7.2a3 3 0 0 1 6 0V9" /></svg>
          </motion.span>
        )}
        {phase === "added" && (
          <motion.span key="added" className="flex items-center gap-2" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
            <CheckIcon size={16} /> Added
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
