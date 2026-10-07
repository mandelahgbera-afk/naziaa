"use client";

import Image from "next/image";
import { useState } from "react";
import { BottomSheet } from "@/components/mobile/bottom-sheet";
import { PlusIcon, CloseIcon } from "@/components/icons";
import { BACKDROPS, backdropFor } from "@/lib/backdrops";
import { formatNaira } from "@/lib/catalog";
import { adjustBatch, createBatch, createProduct, saveProductLook, updateProduct } from "@/app/admin/actions";
import { ImagePicker } from "./image-picker";
import { Card, input, label } from "./ui";
import { useAction } from "./use-action";

type Batch = { id: string; code: string; infused_on: string; expires_on: string | null; qty_produced: number; qty_available: number };
type Benefit = { label: string; source: string };
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
  square_url: string;
  tint_top: string;
  tint_bottom: string;
  benefits: Benefit[] | null;
  how_to_use: string[] | null;
  batches: Batch[];
};

const statusChip = (s: string) =>
  s === "active" ? ["On the shop", "bg-[#e6efdc] text-[#46613a]"] : s === "draft" ? ["Hidden", "bg-cream-deep text-muted"] : ["Archived", "bg-cream-deep text-muted"];

/* ─── the bottle in its arch, on its backdrop ─────────────────────────────── */
function Arch({ src, top, bottom, className = "", sizes }: { src: string; top: string; bottom: string; className?: string; sizes: string }) {
  return (
    <div className={`relative overflow-hidden rounded-t-full rounded-b-2xl transition-[background] duration-500 ${className}`} style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}>
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} className="object-contain p-[10%] drop-shadow-[0_18px_18px_rgba(58,42,34,.25)]" />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-3 text-center text-xs text-ink-soft">No bottle photo yet</span>
      )}
    </div>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Backdrop colour" className="grid grid-cols-4 gap-2">
      {BACKDROPS.map((b) => (
        <button
          key={b.id}
          type="button"
          role="radio"
          aria-checked={value === b.id}
          onClick={() => onChange(b.id)}
          className="group flex flex-col items-center gap-1"
        >
          <span
            className={`block aspect-square w-full rounded-full border-2 transition ${value === b.id ? "scale-105 border-ink" : "border-transparent group-hover:border-line"}`}
            style={{ background: `linear-gradient(180deg, ${b.top}, ${b.bottom})`, boxShadow: `inset 0 -6px 0 ${b.accent}33` }}
          />
          <span className={`text-[10px] tracking-[0.08em] ${value === b.id ? "text-ink" : "text-muted"}`}>{b.name}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── photo & colour ─────────────────────────────────────────────────────── */
function LookEditor({ p, onSaved }: { p: P; onSaved?: () => void }) {
  const { run, pending } = useAction();
  const startBackdrop = backdropFor(p.tint_top, p.tint_bottom)?.id ?? "";
  const [backdrop, setBackdrop] = useState(startBackdrop);
  const [cutout, setCutout] = useState(p.cutout_url);
  const [square, setSquare] = useState(p.square_url);
  const b = BACKDROPS.find((x) => x.id === backdrop);
  const changed = backdrop !== startBackdrop || cutout !== p.cutout_url || square !== p.square_url;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[1fr_auto] items-end gap-4">
        <Arch src={cutout} top={b?.top ?? p.tint_top} bottom={b?.bottom ?? p.tint_bottom} className="aspect-[3/4] w-full max-w-[220px]" sizes="220px" />
        {square ? (
          <div className="relative size-20 overflow-hidden rounded-2xl">
            <Image src={square} alt="" fill sizes="80px" className="object-cover" />
            <button type="button" aria-label="Remove lifestyle photo" onClick={() => setSquare("")} className="absolute top-1 right-1 rounded-full bg-paper/90 p-1">
              <CloseIcon size={10} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <ImagePicker kind="cutout" name={p.name} onUploaded={(url) => setCutout(url)} className="pressable w-full rounded-2xl bg-dark py-3 text-sm text-paper">
          {cutout ? "Upload a new bottle photo" : "Upload bottle photo"}
        </ImagePicker>
        <ImagePicker kind="square" name={p.name} onUploaded={(url) => setSquare(url)} className="pressable w-full rounded-2xl bg-cream-deep py-3 text-sm">
          {square ? "Replace lifestyle photo" : "Add a lifestyle photo (optional)"}
        </ImagePicker>
        <p className="text-xs text-muted">Bottle photo: a PNG with the background removed looks best. Lifestyle photo: any photo, shown as the second picture on the product page.</p>
      </div>

      <div>
        <p className={label}>Backdrop</p>
        <Swatches value={backdrop} onChange={setBackdrop} />
      </div>

      <button
        type="button"
        disabled={pending || !changed}
        onClick={() =>
          run(() =>
            saveProductLook(p.id, {
              backdropId: backdrop,
              ...(cutout !== p.cutout_url ? { cutoutUrl: cutout } : {}),
              ...(square !== p.square_url ? { squareUrl: square } : {}),
            }),
          ).then((ok) => ok && onSaved?.())
        }
        className="btn btn-dark w-full disabled:opacity-40"
      >
        {changed ? "Save photo & colour" : "No changes yet"}
      </button>
    </div>
  );
}

/* ─── benefit pairs + ritual steps ────────────────────────────────────────── */
function BenefitsField({ value, onChange }: { value: Benefit[]; onChange: (v: Benefit[]) => void }) {
  return (
    <div className="sm:col-span-2">
      <p className={label}>What it does (shown as cards on the product page)</p>
      <ul className="space-y-2">
        {value.map((b, i) => (
          <li key={i} className="flex items-center gap-2">
            <input value={b.label} maxLength={40} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="e.g. Stimulates growth" className={input} />
            <input value={b.source} maxLength={40} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)))} placeholder="from e.g. Rosemary" className={`${input} max-w-[40%]`} />
            <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded-full p-2 text-muted hover:bg-cream-deep hover:text-ink">
              <CloseIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
      {value.length < 4 && (
        <button type="button" onClick={() => onChange([...value, { label: "", source: "" }])} className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <PlusIcon size={14} /> Add a benefit
        </button>
      )}
    </div>
  );
}

const cleanBenefits = (v: Benefit[]) => v.map((b) => ({ label: b.label.trim(), source: b.source.trim() })).filter((b) => b.label);
const cleanSteps = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);

/* ─── one product ─────────────────────────────────────────────────────────── */
export function ProductEditor({ product: p }: { product: P }) {
  const [sheet, setSheet] = useState<null | "look" | "details" | "batches">(null);
  const stock = p.batches.reduce((n, b) => n + b.qty_available, 0);
  const latest = [...p.batches].sort((a, b) => b.infused_on.localeCompare(a.infused_on))[0];
  const [chip, chipTone] = statusChip(p.status);
  return (
    <>
      {/* desktop: everything side by side */}
      <Card className="hidden gap-8 md:grid md:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_340px]">
        <LookEditor key={`${p.cutout_url}|${p.square_url}|${p.tint_top}`} p={p} />
        <DetailsForm p={p} />
        <div className="md:col-span-2 xl:col-span-1"><BatchesPanel p={p} /></div>
      </Card>

      {/* phones: a calm summary card; editing happens in sheets */}
      <Card className="md:hidden">
        <div className="flex gap-4">
          <Arch src={p.cutout_url} top={p.tint_top} bottom={p.tint_bottom} className="h-28 w-20 shrink-0" sizes="80px" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-2xl leading-tight">{p.name}</p>
            <p className="mt-1 text-sm">{formatNaira(p.price_kobo)} · {p.size_ml}ml</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${chipTone}`}>{chip}</span>
              <span className="rounded-full bg-cream-deep px-2 py-0.5 text-ink-soft">{p.track_inventory ? `${stock} in stock` : "Always available"}</span>
              {latest && <span className="rounded-full bg-cream-deep px-2 py-0.5 text-ink-soft">Batch {latest.code}</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setSheet("look")} className="pressable rounded-2xl bg-cream py-3 text-sm">Photo & colour</button>
          <button type="button" onClick={() => setSheet("details")} className="pressable rounded-2xl bg-cream py-3 text-sm">Details & price</button>
          <button type="button" onClick={() => setSheet("batches")} className="pressable rounded-2xl bg-cream py-3 text-sm">Stock</button>
        </div>
      </Card>
      <BottomSheet open={sheet === "look"} onClose={() => setSheet(null)} title={<p className="font-serif text-3xl">Photo & colour</p>}>
        <div className="pb-4"><LookEditor key={`${p.cutout_url}|${p.square_url}|${p.tint_top}`} p={p} onSaved={() => setSheet(null)} /></div>
      </BottomSheet>
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
  const [benefits, setBenefits] = useState<Benefit[]>(p.benefits ?? []);
  return (
    <form
      className="grid content-start gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() =>
          updateProduct(p.id, {
            name: String(fd.get("name")),
            subtitle: String(fd.get("subtitle")),
            tagline: String(fd.get("tagline")),
            description: String(fd.get("description")),
            priceNaira: Number(String(fd.get("price")).replace(/[^0-9.]/g, "")),
            sizeMl: Number(fd.get("size")),
            status: fd.get("status") as "draft" | "active" | "archived",
            trackInventory: track,
            lowStockThreshold: Number(fd.get("low") ?? 10),
            benefits: cleanBenefits(benefits),
            howToUse: cleanSteps(String(fd.get("steps") ?? "")),
          }),
        ).then((ok) => ok && onSaved?.());
      }}
    >
      <div className="flex items-center justify-between sm:col-span-2">
        <h2 className="font-serif text-3xl">{p.name}</h2>
        <a href={`/products/${p.slug}`} target="_blank" className="link-underline text-xs tracking-[0.14em] text-muted uppercase">View</a>
      </div>
      <div><label className={label}>Price (₦)</label><input name="price" inputMode="numeric" defaultValue={p.price_kobo / 100} className={`${input} text-base`} /></div>
      <div><label className={label}>Size (ml)</label><input name="size" type="number" min={1} defaultValue={p.size_ml} className={input} /></div>
      <div><label className={label}>Name</label><input name="name" defaultValue={p.name} className={input} /></div>
      <div><label className={label}>Subtitle</label><input name="subtitle" defaultValue={p.subtitle} className={input} /></div>
      <div className="sm:col-span-2"><label className={label}>Tagline</label><input name="tagline" defaultValue={p.tagline ?? ""} className={input} /></div>
      <div className="sm:col-span-2"><label className={label}>Description</label><textarea name="description" defaultValue={p.description} rows={4} className={`${input} resize-y`} /></div>
      <BenefitsField value={benefits} onChange={setBenefits} />
      <div className="sm:col-span-2">
        <label className={label}>The 5-minute ritual (one step per line)</label>
        <textarea name="steps" defaultValue={(p.how_to_use ?? []).join("\n")} rows={3} className={`${input} resize-y`} />
      </div>
      <div>
        <label className={label}>Status</label>
        <select name="status" defaultValue={p.status} className={input}>
          <option value="active">Active — on the shop</option>
          <option value="draft">Hidden — not on the shop</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div><label className={label}>Low-stock alert at</label><input name="low" type="number" min={0} defaultValue={p.low_stock_threshold} className={input} /></div>
      <label className="flex items-center gap-3 text-sm text-ink-soft sm:col-span-2">
        <input type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} className="size-4 accent-amber" />
        Track stock from batches (when off, the product is always available)
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-dark disabled:opacity-50">Save details & price</button>
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

/* ─── a brand-new product ─────────────────────────────────────────────────── */
export function NewProduct() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-dark gap-2">
        <PlusIcon size={14} /> New product
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} desktop="panel" title={<p className="font-serif text-3xl">A new oil</p>}>
        <div className="pb-4">{open && <NewProductForm onDone={() => setOpen(false)} />}</div>
      </BottomSheet>
    </>
  );
}

function NewProductForm({ onDone }: { onDone: () => void }) {
  const { run, pending } = useAction();
  const [name, setName] = useState("");
  const [backdrop, setBackdrop] = useState(BACKDROPS[1].id);
  const [cutout, setCutout] = useState("");
  const [square, setSquare] = useState("");
  const [benefits, setBenefits] = useState<Benefit[]>([{ label: "", source: "" }]);
  const b = BACKDROPS.find((x) => x.id === backdrop) ?? BACKDROPS[0];

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() =>
          createProduct({
            name,
            subtitle: String(fd.get("subtitle")),
            tagline: String(fd.get("tagline")),
            description: String(fd.get("description")),
            priceNaira: Number(String(fd.get("price")).replace(/[^0-9.]/g, "")),
            sizeMl: Number(fd.get("size") || 50),
            status: fd.get("status") as "draft" | "active",
            backdropId: backdrop,
            ...(cutout ? { cutoutUrl: cutout } : {}),
            ...(square ? { squareUrl: square } : {}),
            benefits: cleanBenefits(benefits),
            howToUse: cleanSteps(String(fd.get("steps") ?? "")),
          }),
        ).then((ok) => ok && onDone());
      }}
    >
      <div className="grid grid-cols-[120px_1fr] gap-4">
        <Arch src={cutout} top={b.top} bottom={b.bottom} className="aspect-[3/4]" sizes="120px" />
        <div className="grid content-start gap-2">
          <ImagePicker kind="cutout" name={name || "new-oil"} onUploaded={(url) => setCutout(url)} className="pressable rounded-2xl bg-dark py-3 text-sm text-paper">
            {cutout ? "Change bottle photo" : "Upload bottle photo"}
          </ImagePicker>
          <ImagePicker kind="square" name={name || "new-oil"} onUploaded={(url) => setSquare(url)} className="pressable rounded-2xl bg-cream-deep py-3 text-sm">
            {square ? "Lifestyle photo added ✓" : "Lifestyle photo (optional)"}
          </ImagePicker>
        </div>
      </div>
      <div>
        <p className={label}>Backdrop</p>
        <Swatches value={backdrop} onChange={setBackdrop} />
      </div>
      <div><label className={label}>Name</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hibiscus Rose" className={input} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={label}>Price (₦)</label><input name="price" required inputMode="numeric" placeholder="25000" className={`${input} text-base`} /></div>
        <div><label className={label}>Size (ml)</label><input name="size" type="number" min={1} defaultValue={50} className={input} /></div>
      </div>
      <div><label className={label}>Subtitle</label><input name="subtitle" placeholder="e.g. Hair & Scalp Botanical Oil" className={input} /></div>
      <div><label className={label}>Tagline</label><input name="tagline" placeholder="One short, lovely line" className={input} /></div>
      <div><label className={label}>Description</label><textarea name="description" rows={4} className={`${input} resize-y`} /></div>
      <BenefitsField value={benefits} onChange={setBenefits} />
      <div>
        <label className={label}>The 5-minute ritual (one step per line)</label>
        <textarea name="steps" rows={3} placeholder={"Warm 3–5 drops between your palms.\nMassage into the scalp in slow circles."} className={`${input} resize-y`} />
      </div>
      <div>
        <label className={label}>When saved</label>
        <select name="status" defaultValue="draft" className={input}>
          <option value="draft">Keep it hidden for now</option>
          <option value="active">Put it on the shop straight away</option>
        </select>
      </div>
      <button type="submit" disabled={pending || name.trim().length < 2} className="btn btn-dark disabled:opacity-50">Create product</button>
    </form>
  );
}
