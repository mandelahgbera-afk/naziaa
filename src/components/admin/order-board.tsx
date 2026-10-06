"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { advanceOrder, assignRider } from "@/app/admin/actions";
import { formatNaira } from "@/lib/catalog";
import { STATUS_LABEL } from "@/lib/order-status";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useAction } from "./use-action";

export type BoardOrder = {
  id: string;
  ref: string;
  full_name: string;
  phone: string;
  status: string;
  total_kobo: number;
  promised_by: string | null;
  delivery_window: string | null;
  created_at: string;
  gift_wrap: boolean;
  rider_id: string | null;
  zone: { name: string } | null;
  rider: { name: string } | null;
  items: { qty: number }[];
};

const COLUMNS = [
  { key: "paid", title: "To pack", hint: "Paid, waiting to be prepared" },
  { key: "packed", title: "Needs a rider", hint: "Packed and ready" },
  { key: "assigned", title: "With rider", hint: "Picked up soon" },
  { key: "out_for_delivery", title: "On the road", hint: "Live on the map" },
] as const;

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

function dueLabel(promised: string | null, now: number) {
  if (!promised) return null;
  const diff = new Date(promised).getTime() - now;
  const h = Math.round(Math.abs(diff) / 3600_000);
  if (diff < 0) return { text: h < 1 ? "Late" : `Late by ${h}h`, late: true };
  return { text: h < 1 ? "Due within the hour" : h < 24 ? `Due in ${h}h` : `Due in ${Math.round(h / 24)}d`, late: false };
}

export function OrderBoard({ orders, riders }: { orders: BoardOrder[]; riders: { id: string; name: string }[] }) {
  const router = useRouter();
  const now = useNow();
  const { run, pending } = useAction();

  // live: any order change refreshes the board
  useEffect(() => {
    const channel = supabaseBrowser()
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => router.refresh())
      .subscribe();
    return () => {
      supabaseBrowser().removeChannel(channel);
    };
  }, [router]);

  const failed = orders.filter((o) => o.status === "failed");

  return (
    <div>
      {failed.length > 0 && (
        <div className="mb-6 rounded-[24px] border border-[#e9b9a8] bg-[#fbeee9] p-5">
          <p className="eyebrow text-[#7a2e12]">Needs attention</p>
          <ul className="mt-3 space-y-2">
            {failed.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/admin/orders/${o.id}`} className="underline-offset-4 hover:underline">{o.ref} · {o.full_name} — delivery failed</Link>
                <RiderSelect riders={riders} disabled={pending} onPick={(rid) => run(() => assignRider(o.id, rid), "Re-assigned")} label="Re-assign" />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.key);
          return (
            <section key={col.key} className="rounded-[24px] bg-cream-deep/70 p-3">
              <header className="flex items-baseline justify-between px-2 pt-2 pb-3">
                <div>
                  <h2 className="font-serif text-2xl">{col.title}</h2>
                  <p className="text-xs text-muted">{col.hint}</p>
                </div>
                <span className="font-serif text-2xl text-muted">{list.length}</span>
              </header>
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {list.map((o) => {
                    const due = dueLabel(o.promised_by, now);
                    const units = o.items.reduce((n, i) => n + i.qty, 0);
                    return (
                      <motion.li
                        key={o.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className={`rounded-2xl bg-paper p-4 shadow-[0_1px_0_var(--color-line)] ${due?.late ? "ring-2 ring-[#e3a07f]" : ""}`}
                      >
                        <Link href={`/admin/orders/${o.id}`} className="block">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-muted">{o.ref}</span>
                            {due && <span className={`text-[11px] ${due.late ? "font-normal text-[#a0441a]" : "text-muted"}`}>{due.text}</span>}
                          </div>
                          <p className="mt-1 font-serif text-xl leading-tight">{o.full_name}</p>
                          <p className="mt-1 text-xs text-ink-soft">
                            {o.zone?.name ?? "—"} · {units} bottle{units === 1 ? "" : "s"} · {formatNaira(o.total_kobo)}
                            {o.delivery_window ? ` · ${o.delivery_window}` : ""}
                          </p>
                          {o.gift_wrap && <p className="mt-2 inline-block rounded-full bg-[#efe6ef] px-2 py-0.5 text-[10px] tracking-wide text-[#5b4a70]">Gift wrap</p>}
                          {o.rider && <p className="mt-2 text-xs text-ink-soft">Rider: {o.rider.name}</p>}
                        </Link>
                        <div className="mt-3 border-t border-line pt-3">
                          {o.status === "paid" && (
                            <button type="button" disabled={pending} onClick={() => run(() => advanceOrder(o.id, "packed"), "Marked packed")} className="w-full rounded-full bg-dark py-2 text-xs tracking-[0.16em] text-paper uppercase transition hover:bg-amber disabled:opacity-50">
                              Mark packed
                            </button>
                          )}
                          {o.status === "packed" && <RiderSelect riders={riders} disabled={pending} onPick={(rid) => run(() => assignRider(o.id, rid), "Rider assigned")} label="Assign rider" />}
                          {o.status === "assigned" && (
                            <button type="button" disabled={pending} onClick={() => run(() => advanceOrder(o.id, "out_for_delivery"), "Customer notified: on the way")} className="w-full rounded-full border border-ink py-2 text-xs tracking-[0.16em] uppercase transition hover:bg-ink hover:text-paper disabled:opacity-50">
                              Send out for delivery
                            </button>
                          )}
                          {o.status === "out_for_delivery" && <p className="text-center text-xs text-muted">{STATUS_LABEL[o.status]} — rider completes with the customer’s code</p>}
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {list.length === 0 && <li className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Clear</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function RiderSelect({ riders, onPick, disabled, label }: { riders: { id: string; name: string }[]; onPick: (id: string) => void; disabled?: boolean; label: string }) {
  if (!riders.length) return <Link href="/admin/riders" className="block text-center text-xs text-amber underline">Add a rider first</Link>;
  return (
    <select
      disabled={disabled}
      defaultValue=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="w-full rounded-full border border-line bg-cream px-3 py-2 text-xs outline-none focus:border-amber"
      aria-label={label}
    >
      <option value="" disabled>{label}…</option>
      {riders.map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  );
}
