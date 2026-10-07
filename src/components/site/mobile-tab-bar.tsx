"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/mobile/bottom-sheet";
import { ArrowIcon, BagIcon, BottleIcon, BreathIcon, ChatIcon, HomeIcon, MoreIcon } from "@/components/icons";
import { cartCount, useCart } from "@/lib/cart";
import { haptic } from "@/lib/use-media";

/* The phone's primary navigation: an app-style tab bar pinned to the bottom,
   inside the thumb zone. Hidden on checkout (a focused, distraction-free flow). */

const HIDE_ON = ["/checkout"];

const MORE = [
  { href: "/ingredients", label: "Ingredient library", hint: "The four botanicals" },
  { href: "/journal", label: "Journal", hint: "Wisdom, history & the science" },
  { href: "/our-story", label: "Our story", hint: "Rooted in care, grown from calm" },
  { href: "/track", label: "Track an order", hint: "Where’s my ritual?" },
];

export function MobileTabBar({ whatsapp, instagram, tiktok, email }: { whatsapp: string | null; instagram: string; tiktok: string; email: string }) {
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const bagOpen = useCart((s) => s.open);
  const pulse = useCart((s) => s.pulse);
  const [more, setMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMore(false), [pathname]);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;
  const count = mounted ? cartCount(lines) : 0;

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const tabs = [
    { key: "home", href: "/", label: "Home", icon: (on: boolean) => <HomeIcon filled={on} /> },
    { key: "shop", href: "/shop", label: "Shop", icon: (on: boolean) => <BottleIcon filled={on} />, also: ["/products"] },
    { key: "ritual", href: "/ritual", label: "Ritual", icon: () => <BreathIcon /> },
  ];
  const moreActive = MORE.some((m) => active(m.href));

  return (
    <>
      <nav
        aria-label="App navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-paper/85 pb-safe backdrop-blur-xl md:hidden"
      >
        <ul className="grid h-[4.5rem] grid-cols-5">
          {tabs.map((t) => {
            const on = active(t.href) || (t.also ?? []).some((a) => pathname.startsWith(a));
            return (
              <li key={t.key}>
                <Link href={t.href} onClick={() => haptic()} className="pressable relative flex h-full flex-col items-center justify-center gap-1" aria-current={on ? "page" : undefined}>
                  {on && <motion.span layoutId="tab-pill" className="absolute top-2 h-8 w-14 rounded-full bg-cream-deep" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className={`relative ${on ? "text-amber" : "text-ink-soft"}`}>{t.icon(on)}</span>
                  <span className={`relative text-[10px] tracking-[0.08em] ${on ? "text-ink" : "text-muted"}`}>{t.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => { haptic(); setOpen(true); }} className="pressable relative flex h-full w-full flex-col items-center justify-center gap-1" aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}>
              {bagOpen && <motion.span layoutId="tab-pill" className="absolute top-2 h-8 w-14 rounded-full bg-cream-deep" />}
              <motion.span key={pulse} className="relative text-ink-soft" animate={pulse ? { y: [0, -6, 0], rotate: [0, -10, 8, 0] } : undefined} transition={{ duration: 0.6 }}>
                <BagIcon level={Math.min(1, count / 4)} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-amber px-1 text-[9px] text-paper">{count}</span>
                )}
              </motion.span>
              <span className="relative text-[10px] tracking-[0.08em] text-muted">Bag</span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => { haptic(); setMore(true); }} className="pressable relative flex h-full w-full flex-col items-center justify-center gap-1" aria-haspopup="dialog" aria-expanded={more}>
              {moreActive && <motion.span layoutId="tab-pill" className="absolute top-2 h-8 w-14 rounded-full bg-cream-deep" />}
              <span className={`relative ${moreActive ? "text-amber" : "text-ink-soft"}`}><MoreIcon /></span>
              <span className={`relative text-[10px] tracking-[0.08em] ${moreActive ? "text-ink" : "text-muted"}`}>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <BottomSheet open={more} onClose={() => setMore(false)} title={<p className="font-serif text-3xl">Explore</p>}>
        <ul className="divide-y divide-line">
          {MORE.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="pressable flex items-center justify-between py-4">
                <span>
                  <span className="block font-serif text-2xl">{m.label}</span>
                  <span className="text-sm text-muted">{m.hint}</span>
                </span>
                <ArrowIcon size={14} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-3 pb-2">
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="pressable flex items-center justify-center gap-2 rounded-2xl bg-cream-deep py-4 text-sm">
              <ChatIcon size={18} /> WhatsApp
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="pressable flex items-center justify-center rounded-2xl bg-cream-deep py-4 text-sm">Email us</a>
          )}
          {instagram && (
            <a href={instagram} target="_blank" rel="noreferrer" className="pressable flex items-center justify-center rounded-2xl bg-cream-deep py-4 text-sm">Instagram</a>
          )}
          {tiktok && (
            <a href={tiktok} target="_blank" rel="noreferrer" className="pressable flex items-center justify-center rounded-2xl bg-cream-deep py-4 text-sm">TikTok</a>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
