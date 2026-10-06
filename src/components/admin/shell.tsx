"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { Wordmark } from "@/components/site/wordmark";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Toaster } from "./use-action";

const NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/riders", label: "Riders" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/products", label: "Products & batches" },
  { href: "/admin/hero", label: "Hero video" },
  { href: "/admin/newsletter", label: "Newsletter" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ name, role, badges, children }: { name: string; role: string; badges: Record<string, number>; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex h-full flex-col">
      <Link href="/admin" className="px-2 text-paper"><Wordmark /></Link>
      <p className="mt-2 px-2 text-center text-[0.62rem] tracking-[0.4em] text-paper/40 uppercase">Studio</p>
      <ul className="mt-10 space-y-1">
        {NAV.map((n) => {
          const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
          const badge = badges[n.href];
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition ${active ? "bg-paper/10 text-paper" : "text-paper/60 hover:bg-paper/5 hover:text-paper"}`}
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
          <button
            type="button"
            className="link-underline"
            onClick={async () => {
              await supabaseBrowser().auth.signOut();
              router.replace("/admin/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <Toaster>
    <div className="min-h-dvh bg-cream">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-darker px-4 py-8 lg:block">{nav}</aside>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-darker px-4 py-3 text-paper lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu"><MenuIcon /></button>
        <Wordmark sub={false} />
        <span className="w-6" />
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-darker/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-darker px-4 py-8">
            <button type="button" className="absolute top-4 right-4 text-paper" onClick={() => setOpen(false)} aria-label="Close menu"><CloseIcon /></button>
            {nav}
          </aside>
        </div>
      )}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-10 md:py-12">{children}</div>
      </main>
    </div>
    </Toaster>
  );
}
