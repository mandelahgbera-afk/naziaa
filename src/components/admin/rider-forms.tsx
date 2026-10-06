"use client";

import { createRider, setRiderActive } from "@/app/admin/actions";
import { input, label } from "./ui";
import { useAction } from "./use-action";

export function AddRiderForm({ zones }: { zones: { id: string; name: string }[] }) {
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
        ).then((ok) => ok && form.reset());
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
