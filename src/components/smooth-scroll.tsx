"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";

/* Weighted, unhurried scrolling. Pauses while the bag drawer is open
   and resets to the top on navigation. Skipped for reduced motion. */
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const open = useCart((s) => s.open);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), touchMultiplier: 1.4 });
    lenis.current = l;
    let raf = 0;
    const loop = (time: number) => {
      l.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    if (open) lenis.current?.stop();
    else lenis.current?.start();
  }, [open]);

  return null;
}
