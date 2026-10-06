"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { BagIcon } from "@/components/icons";
import { cartCount, useCart } from "@/lib/cart";
import { Wordmark } from "./wordmark";

export const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/ritual", label: "The Ritual" },
  { href: "/journal", label: "Journal" },
  { href: "/our-story", label: "Our Story" },
];

export function Header({ announcements }: { announcements: string[] }) {
  const pathname = usePathname();
  const overHero = pathname === "/" || pathname === "/ritual";
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const pulse = useCart((s) => s.pulse);
  const [mounted, setMounted] = useState(false);
  // Cart lives in localStorage; only show its count after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const count = mounted ? cartCount(lines) : 0;

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 40);
    setHidden(y > 240 && y > prev);
  });

  const light = overHero && !scrolled;

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-40"
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnnouncementBar items={announcements} light={light} />
        <div
          className={`transition-[background-color,color,box-shadow,backdrop-filter] duration-700 ease-[var(--ease-silk)] ${
            light ? "text-paper" : "bg-cream/80 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl"
          }`}
        >
          <nav className="wrap flex h-16 items-center justify-between md:h-20" aria-label="Main">
            <span className="md:hidden" />

            <ul className="hidden gap-8 md:flex">
              {NAV.slice(0, 3).map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-underline text-[0.74rem] tracking-[0.22em] uppercase">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Link href="/" aria-label="Nazia Botanics — home" className="absolute left-1/2 -translate-x-1/2">
              <Wordmark />
            </Link>

            <div className="flex items-center gap-8">
              <ul className="hidden gap-8 md:flex">
                {NAV.slice(3).map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="link-underline text-[0.74rem] tracking-[0.22em] uppercase">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="relative -mr-2 hidden p-2 md:block"
                aria-label={`Open bag, ${count} item${count === 1 ? "" : "s"}`}
              >
                <motion.span key={pulse} className="block" animate={pulse ? { rotate: [0, -12, 10, -6, 0], scale: [1, 1.15, 1] } : undefined} transition={{ duration: 0.7 }}>
                  <BagIcon level={Math.min(1, count / 4)} />
                </motion.span>
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0, y: -6 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber px-1 text-[10px] font-normal text-paper"
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </nav>
        </div>
      </motion.header>

    </>
  );
}

function AnnouncementBar({ items, light }: { items: string[]; light: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % items.length), 4800);
    return () => window.clearInterval(id);
  }, [items.length]);
  if (!items.length) return null;
  return (
    <div
      className={`relative h-9 overflow-hidden text-center text-[0.66rem] tracking-[0.24em] uppercase transition-colors duration-700 ${
        light ? "bg-darker/30 text-paper/90" : "bg-dark text-paper/90"
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          className="absolute inset-0 grid place-items-center px-4"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {items[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
