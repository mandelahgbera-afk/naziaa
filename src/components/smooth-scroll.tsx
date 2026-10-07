"use client";

import type Lenis from "lenis";
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
    // Touch screens keep native momentum scrolling (and skip this code entirely)
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    let raf = 0;
    let disposed = false;
    import("lenis").then(({ default: LenisCtor }) => {
      if (disposed) return;
      const l = new LenisCtor({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4) });
      lenis.current = l;
      const loop = (time: number) => {
        l.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      lenis.current?.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    if (lenis.current) lenis.current.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (open) lenis.current?.stop();
    else lenis.current?.start();
  }, [open]);

  return null;
}
