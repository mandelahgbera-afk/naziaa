"use client";

import Image from "next/image";
import { useState } from "react";
import { BottomSheet } from "@/components/mobile/bottom-sheet";
import { formatNaira } from "@/lib/catalog";
import { adjustBatch, createBatch, updateProduct } from "@/app/admin/actions";
import { Card, input, label } from "./ui";
import { useAction } from "./use-action";

type Batch = { id: string; code: string; infused_on: string; expires_on: string | null; qty_produced: number; qty_available: number };
type P = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  tagline: string | null;
  description: string;
  price_kobo: number;
  size_ml: number;
  status: string;
  track_inventory: boolean;
  low_stock_threshold: number;
  cutout_url: string;
  tint_top: string;
  tint_bottom: string;
  batches: Batch[];
};

export function ProductEditor({ product: p }: { product: P }) {
  const [sheet, setSheet] = useState<null | "details" | "batches">(null);
  const stock = p.batches.reduce((n, b) => n + b.qty_available, 0);
  const latest = [...p.batches].sort((a, b) => b.infused_on.localeCompare(a.infused_on))[0];
  return (
    <>
      {/* desktop: everything side by side */}
      <Card className="hidden gap-8 md:grid lg:grid-cols-[180px_1fr_360px]">
        <div className="relative hidden aspect-[3/4] overflow-hidden rounded-t-full rounded-b-2xl lg:block" style={{ background: `linear-gradient(180deg, ${p.tint_top}, ${p.tint_bottom})` }}>
          {p.cutout_url && <Image src={p.cutout_url} alt="" fill sizes="180px" className="object-contain p-4" />}
        </div>
        <DetailsForm p={p} />
        <BatchesPanel p={p} />
      </Card>

      {/* phones: a calm summary card; editing happens in sheets */}
      <Card className="md:hidden">
        <div className="flex gap-4">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-t-full rounded-b-xl" style={{ background: `linear-gradient(180deg, ${p.tint_top}, ${p.tint_bottom})` }}>
            {p.cutout_url && <Image src={p.cutout_url} alt="" fill sizes="80px" className="object-contain p-1.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-2xl leading-tight">{p.name}</p>
            <p className="mt-1 text-sm">{formatNaira(p.price_kobo)} · {p.size_ml}ml</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${p.status === "active" ? "bg-[#e6efdc] text-[#46613a]" : "bg-cream-deep text-muted"}`}>{p.status === "active" ? "On the shop" : p.status === "draft" ? "Hidden" : "Archived"}</span>
              <span className="rounded-full bg-cream-deep px-2 py-0.5 text-ink-soft">{p.track_inventory ? `${stock} in stock` : "Always available"}</span>
              {latest && <span className="rounded-full bg-cream-deep px-2 py-0.5 text-ink-soft">Batch {latest.code}</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setSheet("details")} className="pressable rounded-2xl bg-cream py-3 text-sm">Edit details</button>
          <button type="button" onClick={() => setSheet("batches")} className="pressable rounded-2xl bg-cream py-3 text-sm">Batches & stock</button>
        </div>
      </Card>
      <BottomSheet open={sheet === "details"} onClose={() => setSheet(null)} title={<p className="font-serif text-3xl">{p.name}</p>}>
        <div className="pb-4"><DetailsForm p={p} onSaved={() => setSheet(null)} /></div>
      </BottomSheet>
      <BottomSheet open={sheet === "batches"} onClose={() => setSheet(null)} title={<p className="font-serif text-3xl">Batches · {p.name}</p>}>
        <div className="pb-4"><BatchesPanel p={p} /></div>
      </BottomSheet>
    </>
  );
}

function DetailsForm({ p, onSaved }: { p: P; onSaved?: () => void }) {
  const { run, pending } = useAction();
  const [track, setTrack] = useState(p.track_inventory);
  return (
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() =>
            updateProduct(p.id, {
              name: String(fd.get("name")),
              subtitle: String(fd.get("subtitle")),
              tagline: String(fd.get("tagline")),
              description: String(fd.get("description")),
              priceNaira: Number(fd.get("price")),
              sizeMl: Number(fd.get("size")),
              status: fd.get("status") as "draft" | "active" | "archived",
              trackInventory: track,
              lowStockThreshold: Number(fd.get("low") ?? 10),
            }),
          ).then((ok) => ok && onSaved?.());
        }}
      >
        <div className="sm:col-span-2 flex items-center justify-between">
          <h2 className="font-serif text-3xl">{p.name}</h2>
          <a href={`/products/${p.slug}`} target="_blank" className="link-underline text-xs tracking-[0.14em] text-muted uppercase">View</a>
        </div>
        <div><label className={label}>Name</label><input name="name" defaultValue={p.name} className={input} /></div>
        <div><label className={label}>Subtitle</label><input name="subtitle" defaultValue={p.subtitle} className={input} /></div>
        <div className="sm:col-span-2"><label className={label}>Tagline</label><input name="tagline" defaultValue={p.tagline ?? ""} className={input} /></div>
        <div className="sm:col-span-2"><label className={label}>Description</label><textarea name="description" defaultValue={p.description} rows={4} className={`${input} resize-y`} /></div>
        <div><label className={label}>Price (₦)</label><input name="price" type="number" min={0} defaultValue={p.price_kobo / 100} className={input} /></div>
        <div><label className={label}>Size (ml)</label><input name="size" type="number" min={1} defaultValue={p.size_ml} className={input} /></div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={p.status} className={input}>
            <option value="active">Active — on the shop</option>
            <option value="draft">Draft — hidden</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div><label className={label}>Low-stock alert at</label><input name="low" type="number" min={0} defaultValue={p.low_stock_threshold} className={input} /></div>
        <label className="sm:col-span-2 flex items-center gap-3 text-sm text-ink-soft">
          <input type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} className="size-4 accent-amber" />
          Track stock from batches (when off, the product is always available)
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="btn btn-dark disabled:opacity-50">Save product</button>
        </div>
      </form>
  );
}

function BatchesPanel({ p }: { p: P }) {
  const { run, pending } = useAction();
  const batches = [...p.batches].sort((a, b) => b.infused_on.localeCompare(a.infused_on));
  const stock = batches.reduce((n, b) => n + b.qty_available, 0);
  return (
      <div>
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Batches</p>
          <p className="text-sm text-muted">{stock} in stock</p>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {batches.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="font-mono">{b.code}</span>
                <span className="ml-2 text-xs text-muted">{new Date(b.infused_on).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" })}</span>
              </span>
              <input
                type="number"
                min={0}
                defaultValue={b.qty_available}
                aria-label={`Stock for batch ${b.code}`}
                onBlur={(e) => Number(e.target.value) !== b.qty_available && run(() => adjustBatch(b.id, Number(e.target.value)), `Batch ${b.code} updated`)}
                className="w-20 rounded-lg border border-line bg-cream px-2 py-1 text-right"
              />
            </li>
          ))}
          {!batches.length && <li className="py-3 text-sm text-muted">No batches yet.</li>}
        </ul>
        <form
          className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-cream p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            run(() =>
              createBatch(p.id, {
                code: String(fd.get("code")),
                infusedOn: String(fd.get("infused")),
                expiresOn: String(fd.get("expires") ?? ""),
                qty: Number(fd.get("qty")),
              }),
            ).then((ok) => ok && form.reset());
          }}
        >
          <p className="col-span-2 text-xs tracking-[0.14em] text-muted uppercase">New batch</p>
          <input name="code" required placeholder="Code e.g. 08" className={input} />
          <input name="qty" required type="number" min={0} placeholder="Bottles" className={input} />
          <label className="text-[11px] text-muted">Infused<input name="infused" required type="date" className={input} /></label>
          <label className="text-[11px] text-muted">Best before<input name="expires" type="date" className={input} /></label>
          <button type="submit" disabled={pending} className="col-span-2 rounded-full bg-dark py-2 text-xs tracking-[0.14em] text-paper uppercase disabled:opacity-50">Add batch</button>
        </form>
      </div>
  );
}
