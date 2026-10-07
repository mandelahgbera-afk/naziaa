"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Suspense, useEffect, useState } from "react";
import { AlertIcon, ArrowIcon, ChartIcon, ListIcon, MoreIcon, RiderIcon } from "@/components/icons";
import { BottomSheet } from "@/components/mobile/bottom-sheet";
import { Wordmark } from "@/components/site/wordmark";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { haptic } from "@/lib/use-media";
import { AdminBaseProvider } from "./base";
import { MobileTopBar, PullToRefresh } from "./mobile-chrome";
import { Toaster } from "./use-action";

const NAV = [
  { href: "", label: "Today" },
  { href: "/orders", label: "Orders" },
  { href: "/riders", label: "Riders" },
  { href: "/complaints", label: "Complaints" },
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products & batches" },
  { href: "/words", label: "Site words" },
  { href: "/hero", label: "Hero video" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/settings", label: "Settings" },
];

/* Phones get the four things a busy day needs in the thumb zone; the rest sits in “More”. */
const TABS = [
  { href: "", label: "Today", Icon: ChartIcon },
  { href: "/orders", label: "Orders", Icon: ListIcon },
  { href: "/riders", label: "Riders", Icon: RiderIcon },
  { href: "/complaints", label: "Care", Icon: AlertIcon },
];

export function AdminShell({ name, role, base, badges, children }: { name: string; role: string; base: string; badges: Record<string, number>; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMore(false), [pathname]);

  const to = (href: string) => `${base}${href}`;
  const isActive = (href: string) => (href === "" ? pathname === base : pathname.startsWith(to(href)));
  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace(to("/login"));
  };
  const restActive = NAV.slice(4).some((n) => isActive(n.href));

  return (
    <AdminBaseProvider value={base}>
    <Toaster>
      <div className="min-h-dvh bg-cream">
        {/* desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 bg-darker px-4 py-8 lg:block">
          <nav className="flex h-full flex-col">
            <Link href={to("")} className="px-2 text-paper"><Wordmark /></Link>
            <p className="mt-2 px-2 text-center text-[0.62rem] tracking-[0.4em] text-paper/40 uppercase">Studio</p>
            <ul className="mt-10 space-y-1">
              {NAV.map((n) => {
                const badge = badges[n.href];
                return (
                  <li key={n.href}>
                    <Link
                      href={to(n.href)}
                      className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition ${isActive(n.href) ? "bg-paper/10 text-paper" : "text-paper/60 hover:bg-paper/5 hover:text-paper"}`}
                    >
                      {n.label}
                      {badge ? <span className="rounded-full bg-honey px-2 py-0.5 text-[10px] text-darker">{badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto border-t border-paper/10 px-4 pt-5 text-sm text-paper/70">
              <p className="text-paper">{name}</p>
              <p className="text-xs capitalize text-paper/40">{role}</p>
              <div className="mt-4 flex gap-4 text-xs">
                <Link href="/" className="link-underline">View shop</Link>
                <button type="button" className="link-underline" onClick={signOut}>Sign out</button>
              </div>
            </div>
          </nav>
        </aside>

        {/* phone top bar: back button + collapsing title */}
        <Suspense fallback={<div className="h-14 bg-darker lg:hidden" />}>
          <MobileTopBar base={base} initial={name.charAt(0).toUpperCase()} onAvatar={() => setMore(true)} />
        </Suspense>

        <main className="pb-tabbar lg:pb-0 lg:pl-64">
          <PullToRefresh>
            <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-10 md:py-12">{children}</div>
          </PullToRefresh>
        </main>

        {/* phone tab bar */}
        <nav aria-label="Studio navigation" className="fixed inset-x-0 bottom-0 z-40 bg-darker/95 pb-safe text-paper backdrop-blur-xl lg:hidden">
          <ul className="grid h-[4.5rem] grid-cols-5">
            {TABS.map(({ href, label, Icon }) => {
              const on = isActive(href);
              const badge = badges[href];
              return (
                <li key={href}>
                  <Link href={to(href)} onClick={() => haptic()} aria-current={on ? "page" : undefined} className="pressable relative flex h-full flex-col items-center justify-center gap-1">
                    {on && <motion.span layoutId="studio-tab" className="absolute top-2 h-8 w-14 rounded-full bg-paper/10" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span className={`relative ${on ? "text-honey" : "text-paper/60"}`}>
                      <Icon />
                      {badge ? <span className="absolute -top-1.5 -right-2.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-honey px-1 text-[9px] text-darker">{badge}</span> : null}
                    </span>
                    <span className={`relative text-[10px] tracking-[0.08em] ${on ? "text-paper" : "text-paper/50"}`}>{label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={() => { haptic(); setMore(true); }} className="pressable relative flex h-full w-full flex-col items-center justify-center gap-1" aria-haspopup="dialog">
                {restActive && <motion.span layoutId="studio-tab" className="absolute top-2 h-8 w-14 rounded-full bg-paper/10" />}
                <span className={`relative ${restActive ? "text-honey" : "text-paper/60"}`}><MoreIcon /></span>
                <span className="relative text-[10px] tracking-[0.08em] text-paper/50">More</span>
              </button>
            </li>
          </ul>
        </nav>

        <BottomSheet open={more} onClose={() => setMore(false)} tone="dark" title={<div><p className="font-serif text-3xl">Studio</p><p className="text-sm text-paper/50">{name} · <span className="capitalize">{role}</span></p></div>}>
          <ul className="grid grid-cols-2 gap-3">
            {NAV.slice(4).map((n) => (
              <li key={n.href}>
                <Link href={to(n.href)} className={`pressable flex h-24 flex-col justify-between rounded-2xl p-4 ${isActive(n.href) ? "bg-paper/15" : "bg-paper/5"}`}>
                  <span className="font-serif text-xl leading-tight">{n.label}</span>
                  <ArrowIcon size={12} className="text-paper/40" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3 pb-2">
            <Link href="/" className="pressable flex-1 rounded-2xl border border-paper/15 py-3.5 text-center text-sm">View shop</Link>
            <button type="button" onClick={signOut} className="pressable flex-1 rounded-2xl border border-paper/15 py-3.5 text-sm">Sign out</button>
          </div>
        </BottomSheet>
      </div>
    </Toaster>
    </AdminBaseProvider>
  );
}
