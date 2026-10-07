"use client";

import { useState } from "react";
import { createRider, setRiderActive } from "@/app/admin/actions";
import { BottomSheet } from "@/components/mobile/bottom-sheet";
import { Fab } from "./mobile-chrome";
import { input, label } from "./ui";
import { useAction } from "./use-action";

/** Phones: a floating “Add rider” that opens the form in a sheet. */
export function AddRiderFab({ zones }: { zones: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab label="Add rider" onClick={() => setOpen(true)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={<div><p className="font-serif text-3xl">Add a rider</p><p className="text-sm text-muted">They sign in at /rider with this email and password.</p></div>}>
        <div className="pb-4">
          <AddRiderForm zones={zones} onDone={() => setOpen(false)} />
        </div>
      </BottomSheet>
    </>
  );
}

export function AddRiderForm({ zones, onDone }: { zones: { id: string; name: string }[]; onDone?: () => void }) {
  const { run, pending } = useAction();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        run(() =>
          createRider({
            name: String(fd.get("name")),
            phone: String(fd.get("phone")),
            email: String(fd.get("email")),
            password: String(fd.get("password")),
            zoneId: String(fd.get("zone")) || null,
            vehicle: String(fd.get("vehicle") ?? ""),
          }),
        ).then((ok) => {
          if (!ok) return;
          form.reset();
          onDone?.();
        });
      }}
    >
      <div><label className={label}>Full name</label><input name="name" required className={input} /></div>
      <div><label className={label}>Phone</label><input name="phone" required type="tel" className={input} /></div>
      <div><label className={label}>Email (sign-in)</label><input name="email" required type="email" className={input} /></div>
      <div><label className={label}>Temporary password</label><input name="password" required minLength={8} type="text" className={input} placeholder="At least 8 characters" /></div>
      <div>
        <label className={label}>Home zone</label>
        <select name="zone" className={input} defaultValue="">
          <option value="">Any</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>
      <div><label className={label}>Vehicle</label><input name="vehicle" className={input} placeholder="e.g. Motorbike" /></div>
      <button type="submit" disabled={pending} className="btn btn-dark w-full disabled:opacity-50">{pending ? "Adding…" : "Add rider"}</button>
    </form>
  );
}

export function RiderToggle({ id, active }: { id: string; active: boolean }) {
  const { run, pending } = useAction();
  return (
    <button type="button" disabled={pending} onClick={() => run(() => setRiderActive(id, !active))} className="link-underline text-xs tracking-[0.14em] text-muted uppercase">
      {active ? "Pause" : "Reactivate"}
    </button>
  );
}
