"use client";

import { useState } from "react";
import { saveStorefrontSettings, saveZone } from "@/app/admin/actions";
import { input, label } from "./ui";
import { useAction } from "./use-action";

export function StorefrontSettingsForm({ announcements, threshold, whatsapp }: { announcements: string[]; threshold: number | null; whatsapp: string | null }) {
  const { run, pending } = useAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const t = String(fd.get("threshold") ?? "").trim();
        const w = String(fd.get("whatsapp") ?? "").replace(/\D/g, "");
        run(() =>
          saveStorefrontSettings({
            announcements: String(fd.get("announcements")).split("\n").map((s) => s.trim()).filter(Boolean),
            freeDeliveryThresholdNaira: t ? Number(t) : null,
            whatsappNumber: w || null,
          }),
        );
      }}
    >
      <div>
        <label className={label}>Announcement bar (one message per line)</label>
        <textarea name="announcements" defaultValue={announcements.join("\n")} rows={4} className={`${input} resize-y`} />
      </div>
      <div>
        <label className={label}>Free delivery from (₦) — leave empty to turn off</label>
        <input name="threshold" type="number" min={0} defaultValue={threshold ?? ""} className={input} />
      </div>
      <div>
        <label className={label}>WhatsApp number (international, e.g. 2348012345678)</label>
        <input name="whatsapp" inputMode="numeric" defaultValue={whatsapp ?? ""} className={input} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-dark disabled:opacity-50">Save storefront</button>
    </form>
  );
}

type Zone = { id: string; name: string; description: string | null; fee_kobo: number; eta_min_hours: number; eta_max_hours: number; uses_courier: boolean; is_active: boolean };

export function ZoneEditor({ zone }: { zone: Zone | null }) {
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);
  if (!zone && !open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-line py-3 text-sm text-muted hover:border-amber">
        + Add a delivery area
      </button>
    );

  return (
    <form
      className={`grid grid-cols-2 gap-2 rounded-2xl p-3 sm:grid-cols-6 ${zone?.is_active === false ? "bg-cream opacity-60" : "bg-cream"}`}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() =>
          saveZone(zone?.id ?? null, {
            name: String(fd.get("name")),
            description: String(fd.get("description") ?? ""),
            feeNaira: Number(fd.get("fee")),
            etaMinHours: Number(fd.get("min")),
            etaMaxHours: Number(fd.get("max")),
            usesCourier: fd.get("courier") === "on",
            isActive: fd.get("active") === "on",
          }),
        ).then((ok) => ok && !zone && setOpen(false));
      }}
    >
      <input name="name" required defaultValue={zone?.name} placeholder="Area" className={`${input} col-span-2`} />
      <input name="description" defaultValue={zone?.description ?? ""} placeholder="Neighbourhoods" className={`${input} col-span-2 sm:col-span-4`} />
      <label className="text-[11px] text-muted">Fee ₦<input name="fee" type="number" min={0} required defaultValue={zone ? zone.fee_kobo / 100 : ""} className={input} /></label>
      <label className="text-[11px] text-muted">Min hrs<input name="min" type="number" min={1} required defaultValue={zone?.eta_min_hours ?? 24} className={input} /></label>
      <label className="text-[11px] text-muted">Max hrs<input name="max" type="number" min={1} required defaultValue={zone?.eta_max_hours ?? 48} className={input} /></label>
      <label className="flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" name="courier" defaultChecked={zone?.uses_courier} className="accent-amber" /> Courier</label>
      <label className="flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" name="active" defaultChecked={zone?.is_active ?? true} className="accent-amber" /> Active</label>
      <button type="submit" disabled={pending} className="rounded-full bg-dark px-3 py-2 text-xs tracking-[0.14em] text-paper uppercase disabled:opacity-50">Save</button>
    </form>
  );
}
