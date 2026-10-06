"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeDelivery, failDelivery, startDelivery } from "@/app/rider/actions";
import { DropMascot } from "@/components/drop-mascot";
import { Wordmark } from "@/components/site/wordmark";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type Job = {
  id: string;
  ref: string;
  full_name: string;
  phone: string;
  status: "assigned" | "out_for_delivery";
  address: { line1?: string; area?: string; city?: string; landmark?: string; lat?: number | null; lng?: number | null };
  delivery_window: string | null;
  promised_by: string | null;
  gift_wrap: boolean;
  items: { name: string; qty: number }[];
};

/* Shares the rider's position every ~15s while any delivery is on the road. */
function useLocationSharing(riderId: string | null, active: boolean) {
  const [state, setState] = useState<"off" | "on" | "denied">("off");
  const last = useRef(0);
  useEffect(() => {
    if (!riderId || !active || !navigator.geolocation) return;
    const sb = supabaseBrowser();
    let wake: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then((w) => (wake = w)).catch(() => {});
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setState("on");
        if (Date.now() - last.current < 15000) return;
        last.current = Date.now();
        await sb.from("rider_locations").upsert({
          rider_id: riderId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          updated_at: new Date().toISOString(),
        });
      },
      () => setState("denied"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      wake?.release().catch(() => {});
    };
  }, [riderId, active]);
  return active ? state : "off";
}

export function RiderApp({ riderId, name, jobs, doneToday }: { riderId: string | null; name: string; jobs: Job[]; doneToday: number }) {
  const router = useRouter();
  const onRoad = jobs.some((j) => j.status === "out_for_delivery");
  const sharing = useLocationSharing(riderId, onRoad);

  // new assignments appear without a manual refresh
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 30000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-darker px-5 py-4 text-paper">
        <Wordmark sub={false} />
        <span className="text-sm text-paper/70">{name.split(" ")[0]}</span>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Today</p>
            <h1 className="font-serif text-4xl">{jobs.length ? `${jobs.length} to deliver` : "All clear"}</h1>
            <p className="text-sm text-muted">{doneToday} delivered so far</p>
          </div>
          <DropMascot mood={jobs.length ? "idle" : "happy"} size={70} label="" />
        </div>

        {onRoad && (
          <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${sharing === "denied" ? "bg-[#fbeee9] text-[#7a2e12]" : "bg-[#e6efdc] text-[#46613a]"}`}>
            {sharing === "denied" ? "Location is blocked — allow it in your browser so customers can follow you." : "Sharing your location with your customers while you deliver."}
          </p>
        )}
        {!riderId && <p className="mt-4 rounded-2xl bg-[#fbeee9] px-4 py-3 text-sm text-[#7a2e12]">Your account isn’t linked to a rider profile yet. Ask the studio to add you.</p>}

        <ul className="mt-6 space-y-4">
          <AnimatePresence initial={false}>
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

function JobCard({ job: j }: { job: Job }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "complete" | "fail">("idle");
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const a = j.address;
  const dest = a.lat && a.lng ? `${a.lat},${a.lng}` : encodeURIComponent([a.line1, a.area, a.city].filter(Boolean).join(", "));
  const units = j.items.reduce((n, i) => n + i.qty, 0);

  const act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Something went wrong");
      else {
        setMsg(null);
        router.refresh();
      }
    });

  const complete = () =>
    act(async () => {
      let path: string | null = null;
      if (photo) {
        path = `${j.id}/${Date.now()}.${photo.name.split(".").pop() || "jpg"}`;
        const { error } = await supabaseBrowser().storage.from("delivery-proofs").upload(path, photo, { upsert: false });
        if (error) path = null;
      }
      return completeDelivery(j.id, code, path);
    });

  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60 }} className="overflow-hidden rounded-[24px] bg-paper shadow-soft">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted">{j.ref}</span>
          <span className={`rounded-full px-3 py-1 text-xs ${j.status === "out_for_delivery" ? "bg-[#dfeee4] text-[#2f6040]" : "bg-[#e3ecf3] text-[#2f5269]"}`}>
            {j.status === "out_for_delivery" ? "On the way" : "Ready to collect"}
          </span>
        </div>
        <p className="mt-2 font-serif text-3xl leading-tight">{j.full_name}</p>
        <p className="mt-1 text-ink-soft">{[a.line1, a.area, a.city].filter(Boolean).join(", ")}</p>
        {a.landmark && <p className="mt-1 text-sm text-ink">Landmark: {a.landmark}</p>}
        <p className="mt-2 text-sm text-muted">
          {units} bottle{units === 1 ? "" : "s"}{j.delivery_window ? ` · ${j.delivery_window}` : ""}{j.gift_wrap ? " · gift-wrapped" : ""}
          {j.promised_by ? ` · by ${new Date(j.promised_by).toLocaleString("en-NG", { weekday: "short", hour: "numeric" })}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 border-t border-line">
        <a href={`tel:${j.phone}`} className="border-r border-line py-4 text-center text-sm">Call</a>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noreferrer" className="py-4 text-center text-sm">Navigate</a>
      </div>

      <div className="border-t border-line p-4">
        {msg && <p role="alert" className="mb-3 rounded-xl bg-[#fbeee9] px-3 py-2 text-sm text-[#7a2e12]">{msg}</p>}

        {j.status === "assigned" && (
          <button type="button" disabled={pending} onClick={() => act(() => startDelivery(j.id))} className="w-full rounded-full bg-dark py-4 text-sm tracking-[0.16em] text-paper uppercase disabled:opacity-50">
            {pending ? "…" : "Start delivery"}
          </button>
        )}

        {j.status === "out_for_delivery" && mode === "idle" && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode("complete")} className="rounded-full bg-dark py-4 text-sm tracking-[0.14em] text-paper uppercase">Delivered</button>
            <button type="button" onClick={() => setMode("fail")} className="rounded-full border border-line py-4 text-sm tracking-[0.14em] uppercase">Couldn’t deliver</button>
          </div>
        )}

        {mode === "complete" && (
          <div className="space-y-3">
            <label className="block text-sm text-ink-soft">
              Customer’s 6-digit delivery code
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoFocus className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-amber" />
            </label>
            <label className="block text-sm text-ink-soft">
              Photo at the door (optional)
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("idle")} className="rounded-full border border-line py-3 text-sm">Back</button>
              <button type="button" disabled={pending || code.length !== 6} onClick={complete} className="rounded-full bg-amber py-3 text-sm text-paper disabled:opacity-40">{pending ? "Saving…" : "Confirm"}</button>
            </div>
          </div>
        )}

        {mode === "fail" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["Customer not reachable", "Not at home", "Wrong address", "Refused"].map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} className={`rounded-full border px-3 py-2 text-xs ${reason === r ? "border-ink bg-ink text-paper" : "border-line"}`}>{r}</button>
              ))}
            </div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" className="w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-amber" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("idle")} className="rounded-full border border-line py-3 text-sm">Back</button>
              <button type="button" disabled={pending} onClick={() => act(() => failDelivery(j.id, reason))} className="rounded-full bg-[#7a2e12] py-3 text-sm text-paper disabled:opacity-40">Report</button>
            </div>
          </div>
        )}
      </div>
    </motion.li>
  );
}
