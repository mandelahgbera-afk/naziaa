"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { studioPulse } from "@/app/admin/push-actions";
import { CloseIcon } from "@/components/icons";
import { useAdminHref } from "./base";

/* While the Studio is open: a gentle card for each new order or care case, and the screen refreshes.
   Two sources, so it works with phone notifications on or off: the service worker hands over each push,
   and every 30 s (only while the Studio is on screen) the newest paid order is checked. Each shows once. */

type Alert = { id: string; title: string; body: string; url: string };

/** Registers the Studio's notifications worker (scoped to the Studio only). */
export function studioWorker(base: string) {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register(`${base}/push-sw`, { scope: `${base}/` }).catch(() => null);
}

export function StudioAlerts() {
  const router = useRouter();
  const href = useAdminHref();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const seen = useRef(new Set<string>());
  const last = useRef<{ order: string | null; care: number } | null>(null);

  useEffect(() => {
    const show = (a: Alert) => {
      if (seen.current.has(a.id)) return;
      seen.current.add(a.id);
      setAlerts((all) => [...all.slice(-2), a]);
      window.setTimeout(() => setAlerts((all) => all.filter((x) => x.id !== a.id)), 9000);
      router.refresh();
    };

    // a worker is only registered here if this phone already said yes; turning on happens from Settings
    if ("serviceWorker" in navigator && "Notification" in window && Notification.permission === "granted") studioWorker(href());
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.type !== "nazia-push" || d.kind === "test") return;
      show({ id: d.tag || `${d.title}-${d.body}`, title: d.title, body: d.body, url: d.url || href() });
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      const r = await studioPulse().catch(() => null);
      if (!r) return;
      const prev = last.current;
      if (prev) {
        if (r.order && r.order.id !== prev.order) show({ id: `order-${r.order.id}`, title: r.order.title, body: r.order.body, url: href(`/orders/${r.order.id}`) });
        if (r.care > prev.care) show({ id: `care-${r.care}-${Date.now()}`, title: "A customer needs you", body: "A new care case is waiting.", url: href("/complaints") });
      }
      last.current = { order: r.order?.id ?? null, care: r.care };
    };
    check();
    const timer = window.setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = (id: string) => setAlerts((all) => all.filter((x) => x.id !== id));

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:top-6 lg:right-6 lg:items-end">
      <AnimatePresence>
        {alerts.map((a) => (
          <motion.div
            key={a.id}
            role="status"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-paper p-4 pr-2 shadow-float ring-1 ring-line"
          >
            <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-amber-glow" />
            <Link href={a.url} onClick={() => close(a.id)} className="min-w-0 flex-1">
              <span className="block font-serif text-lg leading-tight text-ink">{a.title}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">{a.body}</span>
            </Link>
            <button type="button" onClick={() => close(a.id)} aria-label="Dismiss" className="rounded-full p-2 text-muted hover:bg-cream-deep hover:text-ink">
              <CloseIcon size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
