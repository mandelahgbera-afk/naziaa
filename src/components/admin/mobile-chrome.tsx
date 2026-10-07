"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { haptic } from "@/lib/use-media";

const SECTION_LABEL: Record<string, string> = {
  orders: "Orders",
  riders: "Riders",
  complaints: "Care",
  customers: "Customers",
  products: "Products",
  hero: "Hero video",
  newsletter: "Newsletter",
  settings: "Settings",
};

/* Phone top bar, app-style: a back button on detail screens, and the page’s
   large title collapses into the bar once you scroll past it. */
export function MobileTopBar({ base, initial, onAvatar }: { base: string; initial: string; onAvatar: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [title, setTitle] = useState<string | null>(null);

  const rest = pathname.slice(base.length).split("/").filter(Boolean);
  const section = rest[0] ?? "";
  // detail screens: /orders/<id>, or a settings section opened from the list
  const back =
    rest.length > 1 ? { href: `${base}/${section}`, label: SECTION_LABEL[section] ?? "Back" } :
    section === "settings" && params.get("tab") ? { href: `${base}/settings`, label: "Settings" } :
    null;

  useEffect(() => {
    // a new screen starts with its large title visible
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(null);
    const el = document.querySelector<HTMLElement>("[data-page-title]");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTitle(e.isIntersecting ? null : el.textContent), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [pathname, params]);

  return (
    <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center border-b border-paper/5 bg-darker/95 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2.5 text-paper backdrop-blur-xl lg:hidden">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} onClick={() => haptic()} className="pressable inline-flex items-center gap-1 rounded-full py-1.5 pr-3 pl-1 text-sm text-honey">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
            {back.label}
          </Link>
        ) : (
          <span className="pl-1 font-serif text-lg tracking-[0.3em]">NAZIA</span>
        )}
      </div>
      <AnimatePresence mode="wait">
        {title && (
          <motion.span key={title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }} className="max-w-[46vw] truncate text-sm">
            {title}
          </motion.span>
        )}
      </AnimatePresence>
      <div className="flex justify-end">
        <button type="button" onClick={onAvatar} aria-label="Studio menu" className="pressable grid size-8 place-items-center rounded-full bg-paper/10 text-sm">
          {initial}
        </button>
      </div>
    </header>
  );
}

/* Pull down from the top to refresh, with Drop as the spinner. Phones only. */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, start] = useTransition();
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  const THRESHOLD = 72;

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const down = (e: TouchEvent) => {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const move = (e: TouchEvent) => {
      if (startY.current === null) return;
      const d = e.touches[0].clientY - startY.current;
      if (d <= 0) { setPull(0); return; }
      const eased = Math.min(110, d * 0.5);
      if (eased >= THRESHOLD && !armed.current) { armed.current = true; haptic(10); }
      if (eased < THRESHOLD) armed.current = false;
      setPull(eased);
    };
    const up = () => {
      if (armed.current) start(() => router.refresh());
      armed.current = false;
      startY.current = null;
      setPull(0);
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [router]);

  const shown = refreshing ? THRESHOLD : pull;
  return (
    <>
      <div aria-hidden className="pointer-events-none flex justify-center overflow-hidden lg:hidden" style={{ height: shown, transition: pull ? "none" : "height .35s cubic-bezier(.22,1,.36,1)" }}>
        {shown > 8 && (
          <div className="pt-3" style={{ opacity: Math.min(1, shown / THRESHOLD), transform: `scale(${0.6 + Math.min(1, shown / THRESHOLD) * 0.4})` }}>
            <DropMascot mood={refreshing ? "thinking" : shown >= THRESHOLD ? "happy" : "idle"} size={40} label="" />
          </div>
        )}
      </div>
      {children}
    </>
  );
}

/** Floating action button for a screen’s main “add” action (phones). */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => { haptic(); onClick(); }}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      className="fixed right-4 bottom-tabbar z-30 mb-4 flex items-center gap-2 rounded-full bg-amber py-3.5 pr-5 pl-4 text-sm text-paper shadow-float lg:hidden"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
      {label}
    </motion.button>
  );
}
