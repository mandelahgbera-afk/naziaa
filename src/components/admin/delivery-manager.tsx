"use client";

import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { useState } from "react";
import { deleteZone, reorderZones, saveZone, setZoneActive } from "@/app/admin/actions";
import { CloseIcon, PlusIcon, RiderIcon } from "@/components/icons";
import { BottomSheet } from "@/components/mobile/bottom-sheet";
import { formatNaira } from "@/lib/catalog";
import { AREA_TEMPLATES, SPEEDS, speedFor, speedLabel, type SpeedId } from "@/lib/delivery";
import { useAction } from "./use-action";

export type Zone = {
  id: string;
  name: string;
  description: string | null;
  fee_kobo: number;
  eta_min_hours: number;
  eta_max_hours: number;
  uses_courier: boolean;
  is_active: boolean;
};

type Draft = { id: string | null; name: string; hoods: string[]; fee: string; speed: SpeedId; courier: boolean; active: boolean };

const hoodsOf = (z: Zone) => (z.description ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const toDraft = (z: Zone): Draft => ({
  id: z.id,
  name: z.name,
  hoods: hoodsOf(z),
  fee: z.fee_kobo ? String(z.fee_kobo / 100) : "",
  speed: speedFor(z.eta_min_hours, z.eta_max_hours)?.id ?? (z.uses_courier ? "3-5" : "1-2"),
  courier: z.uses_courier,
  active: z.is_active,
});

export function DeliveryManager({ zones: initial }: { zones: Zone[] }) {
  const { run, pending } = useAction();
  const [order, setOrder] = useState(initial.map((z) => z.id));
  const [draft, setDraft] = useState<Draft | null>(null);
  const byId = new Map(initial.map((z) => [z.id, z]));
  const zones = order.map((id) => byId.get(id)).filter(Boolean) as Zone[];
  // keep local order in sync when the server list changes (add / delete)
  const ids = initial.map((z) => z.id).join();
  const [seen, setSeen] = useState(ids);
  if (ids !== seen) {
    setSeen(ids);
    setOrder(initial.map((z) => z.id));
  }

  const live = zones.filter((z) => z.is_active);
  const unpriced = live.filter((z) => z.fee_kobo === 0);
  const usedNames = new Set(zones.map((z) => z.name.toLowerCase()));
  const templates = AREA_TEMPLATES.filter((t) => !usedNames.has(t.name.toLowerCase()));

  const startNew = (t?: (typeof AREA_TEMPLATES)[number]) =>
    setDraft({ id: null, name: t?.name ?? "", hoods: t?.hoods ?? [], fee: "", speed: t?.speed ?? "next", courier: t?.courier ?? false, active: true });

  return (
    <div>
      {/* at-a-glance summary */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-cream-deep px-3 py-1.5">{live.length} live at checkout</span>
        <span className="rounded-full bg-cream-deep px-3 py-1.5">{live.filter((z) => !z.uses_courier).length} with our riders</span>
        <span className="rounded-full bg-cream-deep px-3 py-1.5">{live.filter((z) => z.uses_courier).length} by courier</span>
        {unpriced.length > 0 && (
          <span className="rounded-full bg-[#fbeee9] px-3 py-1.5 text-[#7a2e12]">
            {unpriced.length} still free (₦0) — tap to set a fee
          </span>
        )}
      </div>

      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="mt-5 space-y-2.5"
      >
        {zones.map((z) => (
          <ZoneRow
            key={z.id}
            zone={z}
            onEdit={() => setDraft(toDraft(z))}
            onToggle={(v) => run(() => setZoneActive(z.id, v))}
            onDrop={() => order.join() !== initial.map((x) => x.id).join() && run(() => reorderZones(order), "Order saved")}
            disabled={pending}
          />
        ))}
      </Reorder.Group>

      {zones.length > 1 && <p className="mt-2 text-xs text-muted">Drag ⠿ to change the order customers see at checkout.</p>}

      <button type="button" onClick={() => startNew()} className="pressable mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sand py-4 text-sm transition hover:border-amber">
        <PlusIcon size={16} /> Add a delivery area
      </button>

      {templates.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow mb-2">Quick add</p>
          <div className="-mx-1 flex flex-wrap gap-2">
            {templates.map((t) => (
              <button key={t.name} type="button" onClick={() => startNew(t)} className="pressable rounded-full border border-line bg-paper px-3.5 py-2 text-sm transition hover:border-amber">
                + {t.name}
                {t.courier && <span className="ml-1.5 text-xs text-muted">courier</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <ZoneEditor
        draft={draft}
        onClose={() => setDraft(null)}
        others={zones.filter((z) => z.id !== draft?.id && z.fee_kobo > 0)}
        pending={pending}
        onSave={(d) =>
          run(() =>
            saveZone(d.id, {
              name: d.name,
              neighbourhoods: d.hoods,
              feeNaira: Number(d.fee || 0),
              etaMinHours: SPEEDS.find((s) => s.id === d.speed)!.min,
              etaMaxHours: SPEEDS.find((s) => s.id === d.speed)!.max,
              usesCourier: d.courier,
              isActive: d.active,
            }),
          ).then((ok) => ok && setDraft(null))
        }
        onDelete={(id) => {
          if (!window.confirm("Delete this area? If orders have used it, you’ll be asked to hide it instead.")) return;
          run(() => deleteZone(id)).then((ok) => ok && setDraft(null));
        }}
      />
    </div>
  );
}

function ZoneRow({ zone: z, onEdit, onToggle, onDrop, disabled }: { zone: Zone; onEdit: () => void; onToggle: (v: boolean) => void; onDrop: () => void; disabled: boolean }) {
  const drag = useDragControls();
  const hoods = hoodsOf(z);
  return (
    <Reorder.Item
      value={z.id}
      dragListener={false}
      dragControls={drag}
      onDragEnd={onDrop}
      className={`flex items-center gap-3 rounded-2xl bg-paper p-3 pr-4 shadow-[0_1px_0_var(--color-line)] ${z.is_active ? "" : "opacity-55"}`}
    >
      <button type="button" aria-label={`Drag to reorder ${z.name}`} onPointerDown={(e) => drag.start(e)} className="cursor-grab touch-none px-1 py-3 text-lg leading-none text-muted active:cursor-grabbing">
        ⠿
      </button>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-serif text-xl leading-tight">{z.name}</span>
          <span className={`text-sm ${z.fee_kobo ? "" : "text-[#a0441a]"}`}>{z.fee_kobo ? formatNaira(z.fee_kobo) : "Set a fee"}</span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <span className="rounded-full bg-cream-deep px-2 py-0.5">{speedLabel(z.eta_min_hours, z.eta_max_hours)}</span>
          <span className="flex items-center gap-1 rounded-full bg-cream-deep px-2 py-0.5">
            <RiderIcon size={12} /> {z.uses_courier ? "Courier" : "Our riders"}
          </span>
          {hoods.slice(0, 2).map((h) => (
            <span key={h} className="hidden text-muted sm:inline">{h} ·</span>
          ))}
          {hoods.length > 2 && <span className="hidden text-muted sm:inline">+{hoods.length - 2} more</span>}
        </span>
      </button>
      <Switch on={z.is_active} onChange={onToggle} disabled={disabled} label={`Show ${z.name} at checkout`} />
    </Reorder.Item>
  );
}

export function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${on ? "bg-[#5d7a4f]" : "bg-sand"}`}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }} className={`absolute top-1 size-5 rounded-full bg-paper shadow ${on ? "right-1" : "left-1"}`} />
    </button>
  );
}

function ZoneEditor({
  draft,
  onClose,
  onSave,
  onDelete,
  others,
  pending,
}: {
  draft: Draft | null;
  onClose: () => void;
  onSave: (d: Draft) => void;
  onDelete: (id: string) => void;
  others: Zone[];
  pending: boolean;
}) {
  const [d, setD] = useState<Draft | null>(draft);
  const [hoodText, setHoodText] = useState("");
  const [lastDraft, setLastDraft] = useState(draft);
  if (draft !== lastDraft) {
    setLastDraft(draft);
    setD(draft);
    setHoodText("");
  }
  const set = (patch: Partial<Draft>) => setD((cur) => (cur ? { ...cur, ...patch } : cur));

  const addHoods = (text: string) => {
    const parts = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length || !d) return;
    set({ hoods: [...d.hoods, ...parts.filter((p) => !d.hoods.some((h) => h.toLowerCase() === p.toLowerCase()))] });
    setHoodText("");
  };

  const sameKind = d ? others.filter((z) => z.uses_courier === d.courier) : [];
  const fees = sameKind.map((z) => z.fee_kobo);
  const feeHint = fees.length ? `Your other ${d?.courier ? "courier" : "rider"} areas charge ${formatNaira(Math.min(...fees))}${Math.max(...fees) !== Math.min(...fees) ? `–${formatNaira(Math.max(...fees))}` : ""}.` : null;
  const speed = d ? SPEEDS.find((s) => s.id === d.speed)! : SPEEDS[1];
  const feeNum = Number(d?.fee || 0);

  return (
    <BottomSheet
      open={Boolean(d)}
      onClose={onClose}
      desktop="panel"
      title={<p className="font-serif text-3xl">{d?.id ? "Edit area" : "New delivery area"}</p>}
      footer={
        d && (
          <div className="flex items-center gap-3">
            {d.id && (
              <button type="button" onClick={() => onDelete(d.id!)} className="text-sm text-[#7a2e12] underline-offset-4 hover:underline">
                Delete
              </button>
            )}
            <button type="button" disabled={pending || d.name.trim().length < 2} onClick={() => onSave(d)} className="btn btn-dark ml-auto disabled:opacity-50">
              {pending ? "Saving…" : "Save area"}
            </button>
          </div>
        )
      }
    >
      {d && (
        <div className="space-y-7 pb-4">
          <Field label="Area name">
            <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Lekki & Ajah" className={fieldClass} autoFocus={!d.id} />
          </Field>

          <Field label="Neighbourhoods" hint="Helps customers pick the right area. Type and press Enter or comma.">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-cream p-2 focus-within:border-amber">
              <AnimatePresence initial={false}>
                {d.hoods.map((h) => (
                  <motion.span key={h} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-1 rounded-full bg-paper py-1 pr-1 pl-3 text-sm shadow-[0_1px_0_var(--color-line)]">
                    {h}
                    <button type="button" aria-label={`Remove ${h}`} onClick={() => set({ hoods: d.hoods.filter((x) => x !== h) })} className="rounded-full p-1 text-muted hover:bg-cream-deep hover:text-ink">
                      <CloseIcon size={12} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <input
                value={hoodText}
                onChange={(e) => (e.target.value.endsWith(",") ? addHoods(e.target.value) : setHoodText(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addHoods(hoodText); }
                  if (e.key === "Backspace" && !hoodText && d.hoods.length) set({ hoods: d.hoods.slice(0, -1) });
                }}
                onBlur={() => addHoods(hoodText)}
                placeholder={d.hoods.length ? "Add another…" : "e.g. Lekki Phase 1"}
                className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
              />
            </div>
          </Field>

          <Field label="Who delivers?">
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: false, title: "Our riders", sub: "Live map tracking" },
                { v: true, title: "Courier", sub: "For other cities" },
              ].map((o) => (
                <button
                  key={o.title}
                  type="button"
                  aria-pressed={d.courier === o.v}
                  onClick={() => set({ courier: o.v, speed: o.v && (d.speed === "same" || d.speed === "next") ? "2-3" : d.speed })}
                  className={`pressable rounded-2xl border p-3.5 text-left transition ${d.courier === o.v ? "border-ink bg-paper shadow-soft" : "border-line"}`}
                >
                  <span className="block font-serif text-lg">{o.title}</span>
                  <span className="text-xs text-muted">{o.sub}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Delivery fee" hint={feeHint ?? undefined}>
            <div className="flex items-center rounded-xl border border-line bg-cream focus-within:border-amber">
              <span className="pl-3.5 text-muted">₦</span>
              <input
                inputMode="numeric"
                value={d.fee ? Number(d.fee).toLocaleString("en-NG") : ""}
                onChange={(e) => set({ fee: e.target.value.replace(/\D/g, "").slice(0, 7) })}
                placeholder="0"
                className="w-full bg-transparent px-2 py-2.5 text-lg outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(d.courier ? [3500, 5000, 7500, 10000] : [1500, 2000, 3000, 4000]).map((n) => (
                <button key={n} type="button" onClick={() => set({ fee: String(n) })} className={`rounded-full border px-3 py-1 text-xs transition ${feeNum === n ? "border-ink bg-ink text-paper" : "border-line hover:border-sand"}`}>
                  {formatNaira(n * 100)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="How long it takes" hint="This is the promise customers see; orders past it are flagged as late.">
            <div className="grid grid-cols-3 gap-2">
              {SPEEDS.map((s) => (
                <button key={s.id} type="button" aria-pressed={d.speed === s.id} onClick={() => set({ speed: s.id })} className={`pressable rounded-xl border px-2 py-2.5 text-sm transition ${d.speed === s.id ? "border-ink bg-paper shadow-soft" : "border-line"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
            <span>
              <span className="block text-sm">Show at checkout</span>
              <span className="text-xs text-muted">Turn off to pause this area without deleting it.</span>
            </span>
            <Switch on={d.active} onChange={(v) => set({ active: v })} label="Show at checkout" />
          </div>

          {/* exactly what a customer sees */}
          <div>
            <p className="eyebrow mb-2">Customers will see</p>
            <div className="rounded-2xl border border-ink bg-paper p-4 shadow-soft">
              <span className="flex items-center justify-between gap-3">
                <span className="font-serif text-xl">{d.name || "Area name"}</span>
                <span className="text-sm">{feeNum ? formatNaira(feeNum * 100) : <span className="text-[#a0441a]">₦0 — free</span>}</span>
              </span>
              {d.hoods.length > 0 && <span className="mt-1 block text-xs text-muted">{d.hoods.join(", ")}</span>}
              <span className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                <RiderIcon size={14} /> {d.courier ? "Courier" : "Our own riders"} · arrives {speed.label.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

const fieldClass = "w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 outline-none transition focus:border-amber focus:ring-4 focus:ring-honey/20";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs tracking-[0.14em] text-muted uppercase">{label}</p>
      {children}
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}
