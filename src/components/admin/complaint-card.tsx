"use client";

import Link from "next/link";
import { useState } from "react";
import { resolveComplaint, setComplaintStatus } from "@/app/admin/actions";
import { Card, input } from "./ui";
import { useAdminHref } from "./base";
import { useAction } from "./use-action";

type C = {
  id: string;
  category: string;
  body: string;
  status: string;
  resolution: string | null;
  resolution_note: string | null;
  created_at: string;
  order: { id: string; ref: string; full_name: string; phone: string; email: string } | null;
  rider: { name: string } | null;
};

const LABEL: Record<string, string> = { late: "Late delivery", damaged: "Arrived damaged", wrong_item: "Wrong item", skin_reaction: "Skin / scalp reaction", missing: "Item missing", other: "Other" };

export function ComplaintCard({ c }: { c: C }) {
  const admin = useAdminHref();
  const { run, pending } = useAction();
  const [resolution, setResolution] = useState<"refund" | "replacement" | "store_credit" | "none">("replacement");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const urgent = c.category === "skin_reaction";

  return (
    <Card className={urgent && c.status !== "resolved" ? "ring-2 ring-[#e3a07f]" : ""}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`eyebrow ${urgent ? "text-[#a0441a]" : ""}`}>{LABEL[c.category] ?? c.category}{urgent ? " · reply today" : ""}</p>
          {c.order && (
            <Link href={admin(`/orders/${c.order.id}`)} className="mt-1 block font-serif text-2xl hover:text-amber">
              {c.order.full_name} · <span className="font-mono text-base">{c.order.ref}</span>
            </Link>
          )}
          <p className="text-xs text-muted">{new Date(c.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{c.rider ? ` · rider ${c.rider.name}` : ""}</p>
        </div>
        <span className="rounded-full bg-cream-deep px-3 py-1 text-xs capitalize">{c.status.replace("_", " ")}</span>
      </div>
      <p className="mt-4 rounded-2xl bg-cream p-4 text-ink-soft">“{c.body}”</p>

      {c.status === "resolved" ? (
        <p className="mt-4 text-sm text-ink-soft">Resolved with <strong className="font-normal">{c.resolution?.replace("_", " ")}</strong>{c.resolution_note ? ` — ${c.resolution_note}` : ""}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {c.order && (
            <div className="flex gap-3 text-xs">
              <a className="link-underline" href={`https://wa.me/${c.order.phone.replace(/\D/g, "").replace(/^0/, "234")}`} target="_blank" rel="noreferrer">WhatsApp {c.order.full_name.split(" ")[0]}</a>
              <a className="link-underline" href={`mailto:${c.order.email}?subject=Your order ${c.order.ref}`}>Email</a>
              {c.status === "open" && <button type="button" className="link-underline" onClick={() => run(() => setComplaintStatus(c.id, "in_progress"), "Marked in progress")}>Mark in progress</button>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["replacement", "refund", "store_credit", "none"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setResolution(r)} className={`rounded-full border px-3 py-2 text-xs capitalize transition ${resolution === r ? "border-ink bg-ink text-paper" : "border-line"}`}>
                {r.replace("_", " ")}
              </button>
            ))}
          </div>
          {(resolution === "refund" || resolution === "store_credit") && (
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={0} placeholder="Amount (₦)" className={input} />
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you do? (kept on record)" className={input} />
          <button type="button" disabled={pending} onClick={() => run(() => resolveComplaint(c.id, resolution, note, amount ? Number(amount) : undefined), "Resolved")} className="btn btn-dark disabled:opacity-50">
            Resolve
          </button>
        </div>
      )}
    </Card>
  );
}
