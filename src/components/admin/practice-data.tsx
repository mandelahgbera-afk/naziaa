"use client";

import { useState } from "react";
import { clearPracticeData } from "@/app/admin/actions";
import type { DemoCounts } from "@/lib/demo";
import { useAction } from "./use-action";

export function PracticeData({ counts, canClear }: { counts: DemoCounts; canClear: boolean }) {
  const { run, pending } = useAction();
  const [typed, setTyped] = useState("");
  const total = counts.orders + counts.customers + counts.riders + counts.bags + counts.subscribers;
  const rows = [
    ["Orders", counts.orders],
    ["Customers", counts.customers],
    ["Riders", counts.riders],
    ["Abandoned bags", counts.bags],
    ["Subscribers", counts.subscribers],
  ] as const;

  if (!total) {
    return (
      <div className="rounded-2xl bg-cream-deep px-5 py-6 text-center">
        <p className="font-serif text-2xl">All clear.</p>
        <p className="mt-1 text-sm text-muted">There’s no practice data — everything in the Studio is real.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">
        These are the made-up orders, customers and riders added for practice. Removing them leaves every real order, customer, rider, product and setting exactly as it is.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rows.map(([name, n]) => (
          <div key={name} className="rounded-2xl bg-cream-deep px-4 py-3">
            <dt className="text-[0.68rem] tracking-[0.14em] text-muted uppercase">{name}</dt>
            <dd className="mt-1 font-serif text-2xl">{n}</dd>
          </div>
        ))}
      </dl>
      {canClear ? (
        <div className="mt-6 border-t border-line pt-5">
          <label htmlFor="confirm-clear" className="text-sm">
            Type <strong>CLEAR</strong> to confirm
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              id="confirm-clear"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="w-40 rounded-xl border border-line bg-cream px-3.5 py-2.5 uppercase outline-none focus:border-amber"
            />
            <button
              type="button"
              disabled={pending || typed.trim().toUpperCase() !== "CLEAR"}
              onClick={() => run(async () => {
                const r = await clearPracticeData();
                if (r.ok) setTyped("");
                return r;
              })}
              className="btn bg-[#a0441a] text-paper disabled:opacity-40"
            >
              {pending ? "Removing…" : "Remove practice data"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">This can’t be undone, but it only ever touches practice records.</p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">Only the owner can remove practice data.</p>
      )}
    </div>
  );
}
