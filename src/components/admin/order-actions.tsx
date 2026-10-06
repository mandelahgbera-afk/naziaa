"use client";

import { useState } from "react";
import { addOrderNote, advanceOrder, assignRider } from "@/app/admin/actions";
import { STATUS_LABEL } from "@/lib/order-status";
import { Card, input } from "./ui";
import { useAction } from "./use-action";

const DANGER = new Set(["cancelled", "refunded", "returned", "failed"]);

export function OrderActions({ orderId, status, next, riders, riderId }: { orderId: string; status: string; next: string[]; riders: { id: string; name: string }[]; riderId: string | null }) {
  const { run, pending } = useAction();
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Card>
      <p className="eyebrow mb-4">Move this order</p>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || (s === "failed" && !reason)}
            onClick={() => {
              if (DANGER.has(s) && !window.confirm(`Move to “${STATUS_LABEL[s]}”?`)) return;
              run(() => advanceOrder(orderId, s, s === "failed" ? reason : undefined), `Moved to ${STATUS_LABEL[s]}`);
            }}
            className={`rounded-full px-4 py-2 text-xs tracking-[0.14em] uppercase transition disabled:opacity-40 ${DANGER.has(s) ? "border border-[#e3a07f] text-[#7a2e12] hover:bg-[#fbeee9]" : "bg-dark text-paper hover:bg-amber"}`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        {next.length === 0 && <p className="text-sm text-muted">This order is closed.</p>}
      </div>
      {next.includes("failed") && (
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, if the delivery failed" className={`${input} mt-3`} />
      )}

      {["packed", "assigned", "failed"].includes(status) && (
        <div className="mt-6">
          <p className="eyebrow mb-2">Rider</p>
          <select
            defaultValue={riderId ?? ""}
            disabled={pending}
            onChange={(e) => e.target.value && run(() => assignRider(orderId, e.target.value), "Rider assigned")}
            className={input}
          >
            <option value="" disabled>Choose a rider…</option>
            {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      <div className="mt-6">
        <p className="eyebrow mb-2">Internal note</p>
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to the team only" className={input} />
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={() => run(() => addOrderNote(orderId, note), "Note added").then((ok) => ok && setNote(""))}
            className="rounded-full border border-ink px-4 text-xs tracking-[0.14em] uppercase disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </Card>
  );
}
