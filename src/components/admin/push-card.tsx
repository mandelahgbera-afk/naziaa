"use client";

import { useEffect, useState } from "react";
import { pushKindsFor, removePushSubscription, savePushSubscription, sendTestPush, updatePushKinds } from "@/app/admin/push-actions";
import { DropMascot } from "@/components/drop-mascot";
import { useAdminHref } from "./base";
import { Switch } from "./delivery-manager";
import { studioWorker } from "./studio-alerts";

/* Notifications on this phone: turn on (the phone asks once, from a tap), choose what to hear about,
   send a test, turn off. iPhones only allow it once the Studio is on the Home Screen and opened from there. */

type Kind = { id: string; label: string; hint: string };
type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function PushCard({ publicKey, kinds: KINDS }: { publicKey: string | null; kinds: Kind[] }) {
  const href = useAdminHref();
  const [state, setState] = useState<State>("loading");
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [kinds, setKinds] = useState<string[]>(KINDS.map((k) => k.id));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    (async () => {
      const apple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      setIos(apple);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(apple && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await studioWorker(href());
      const s = reg ? await reg.pushManager.getSubscription() : null;
      if (s) {
        const saved = await pushKindsFor(s.endpoint).catch(() => null);
        if (saved) setKinds(saved);
        else await savePushSubscription(s.toJSON(), kinds, deviceName()).catch(() => null);
      }
      setSub(s);
      setState(s ? "on" : "off");
    })().catch(() => setState("unsupported"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function turnOn() {
    if (!publicKey) return;
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await studioWorker(href());
      if (!reg) throw new Error("no worker");
      await navigator.serviceWorker.ready;
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
      const r = await savePushSubscription(s.toJSON(), kinds, deviceName());
      if (r.ok) {
        setSub(s);
        setState("on");
        setMsg({ ok: true, text: "On. Send yourself a test to see how it looks." });
      } else setMsg({ ok: false, text: r.error });
    } catch {
      setMsg({ ok: false, text: "This phone didn’t allow it. Try once more, or check its notification settings." });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!sub) return;
    setBusy(true);
    await removePushSubscription(sub.endpoint).catch(() => null);
    await sub.unsubscribe().catch(() => null);
    setSub(null);
    setState("off");
    setBusy(false);
    setMsg({ ok: true, text: "Off for this phone. Your other phones keep theirs." });
  }

  async function toggle(id: string, on: boolean) {
    const next = on ? [...new Set([...kinds, id])] : kinds.filter((k) => k !== id);
    if (!next.length) return setMsg({ ok: false, text: "Keep at least one on, or turn notifications off for this phone." });
    setKinds(next);
    if (!sub) return;
    const r = await updatePushKinds(sub.endpoint, next);
    setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
  }

  async function test() {
    if (!sub) return;
    setBusy(true);
    const r = await sendTestPush(sub.endpoint);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: r.message ?? "Sent." } : { ok: false, text: r.error });
  }

  return (
    <div aria-live="polite">
      <h2 className="font-serif text-3xl">Hear about orders without checking.</h2>
      <p className="mt-2 mb-5 text-sm text-muted">A quiet buzz on this phone the moment a payment clears, even with the Studio closed. Each phone you use is set up on its own.</p>

      {!publicKey ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-4 text-sm text-muted">Phone notifications switch on once the shop&rsquo;s notification keys are added in Vercel.</p>
      ) : state === "loading" ? (
        <p className="flex items-center gap-3 text-sm text-muted"><DropMascot mood="idle" size={28} label="" />Checking this phone…</p>
      ) : state === "ios-install" ? (
        <div className="rounded-2xl bg-cream-deep px-5 py-4 text-sm leading-relaxed text-ink-soft">
          <p className="text-ink">On iPhone, put the Studio on your Home Screen first.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>In Safari, tap <span className="text-ink">Share</span> (the square with an arrow).</li>
            <li>Choose <span className="text-ink">Add to Home Screen</span>, then <span className="text-ink">Add</span>.</li>
            <li>Open <span className="text-ink">Studio</span> from that new icon and come back to this page.</li>
          </ol>
        </div>
      ) : state === "unsupported" ? (
        <p className="text-sm text-muted">This browser can&rsquo;t receive notifications. Use Chrome on Android, or the Studio added to an iPhone&rsquo;s Home Screen.</p>
      ) : state === "blocked" ? (
        <p className="rounded-2xl bg-[#7a2e12]/8 px-5 py-4 text-sm leading-relaxed text-[#7a2e12]">
          Notifications are blocked for the Studio on this phone.{" "}
          {ios ? "Open Settings → Notifications → Studio and allow them, then come back." : "Tap the lock or settings icon beside the address, allow Notifications (or Settings → Apps → Chrome → Notifications), then come back."}
        </p>
      ) : state === "off" ? (
        <button type="button" onClick={turnOn} disabled={busy} className="btn btn-dark disabled:opacity-50">
          {busy ? "Asking this phone…" : "Turn on for this phone"}
        </button>
      ) : (
        <div className="space-y-5">
          <p className="flex items-center gap-2 text-sm text-ink"><span className="size-2 rounded-full bg-sage" />On for this phone</p>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-cream">
            {KINDS.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-sm text-ink">{k.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{k.hint}</span>
                </span>
                <Switch on={kinds.includes(k.id)} onChange={(v) => toggle(k.id, v)} label={k.label} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={test} disabled={busy} className="btn btn-dark disabled:opacity-50">Send a test</button>
            <button type="button" onClick={turnOff} disabled={busy} className="text-sm text-muted underline-offset-4 hover:underline">Turn off on this phone</button>
          </div>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-4 text-sm ${msg.ok ? "text-ink-soft" : "text-[#7a2e12]"}`}>{msg.text}</p>}
    </div>
  );
}

function deviceName() {
  const ua = navigator.userAgent;
  return /iphone/i.test(ua) ? "iPhone" : /ipad/i.test(ua) ? "iPad" : /android/i.test(ua) ? "Android phone" : "Computer";
}
