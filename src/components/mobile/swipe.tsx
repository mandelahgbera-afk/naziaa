"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { haptic } from "@/lib/use-media";

/** Which snap item is closest to the rail's centre; updates as you swipe. */
export function useSnapIndex(rail: RefObject<HTMLElement | null>, count: number) {
  const [index, setIndex] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const kids = Array.from(el.children).filter((c) => (c as HTMLElement).dataset.snap !== undefined) as HTMLElement[];
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestD = Infinity;
        kids.forEach((k, i) => {
          const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid);
          if (d < bestD) { bestD = d; best = i; }
        });
        const next = Math.min(best, count - 1);
        if (next !== last.current) {
          last.current = next;
          haptic(8);
          setIndex(next);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [rail, count]);

  const goTo = (i: number) => {
    const el = rail.current;
    const kids = el ? (Array.from(el.children).filter((c) => (c as HTMLElement).dataset.snap !== undefined) as HTMLElement[]) : [];
    const k = kids[i];
    if (el && k) el.scrollTo({ left: k.offsetLeft - (el.clientWidth - k.offsetWidth) / 2, behavior: "smooth" });
  };
  return { index, goTo };
}

/** Position indicator drawn as drops of oil: the current one fills and stretches. */
export function DropDots({ count, index, onPick, tone = "light", labels }: { count: number; index: number; onPick: (i: number) => void; tone?: "light" | "dark"; labels?: string[] }) {
  const ink = tone === "dark" ? "var(--color-paper)" : "var(--color-ink)";
  return (
    <div className="flex items-center justify-center gap-2.5" role="tablist" aria-label="Choose a slide">
      {Array.from({ length: count }, (_, i) => {
        const on = i === index;
        return (
          <button key={i} type="button" role="tab" aria-selected={on} aria-label={labels?.[i] ?? `Slide ${i + 1}`} onClick={() => onPick(i)} className="grid h-8 place-items-center px-0.5">
            <motion.svg viewBox="0 0 12 16" initial={false} animate={{ width: on ? 14 : 9, height: on ? 19 : 12 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}>
              <path d="M6 1s5 5.4 5 9a5 5 0 0 1-10 0C1 6.4 6 1 6 1Z" fill={on ? "var(--color-honey)" : "none"} stroke={on ? "var(--color-amber)" : ink} strokeOpacity={on ? 1 : 0.35} strokeWidth="1.2" />
            </motion.svg>
          </button>
        );
      })}
    </div>
  );
}
