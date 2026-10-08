"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { CheckIcon, RiderIcon } from "@/components/icons";
import { cartSubtotal, useCart, type CartLine } from "@/lib/cart";
import { formatNaira, type Product } from "@/lib/catalog";
import { speedLabel } from "@/lib/delivery";
import type { Zone } from "@/lib/orders";

const PinMap = dynamic(() => import("@/components/maps/pin-map").then((m) => m.PinMap), { ssr: false });

const WINDOWS = [
  { id: "morning", label: "Morning", hint: "9am – 12pm" },
  { id: "afternoon", label: "Afternoon", hint: "12pm – 4pm" },
  { id: "evening", label: "Evening", hint: "4pm – 7pm" },
] as const;

const field = "w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-[0.98rem] outline-none transition placeholder:text-muted/70 focus:border-amber focus:ring-4 focus:ring-honey/20";

export function CheckoutForm({ zones, products, freeDeliveryThresholdKobo }: { zones: Zone[]; products: Product[]; freeDeliveryThresholdKobo: number | null }) {
  const { lines, giftWrap, giftNote, setGift, add } = useCart();
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [win, setWin] = useState<(typeof WINDOWS)[number]["id"]>("afternoon");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const sessionId = useRef<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Restore a bag from a reminder email (?bag=<checkout session id>)
  useEffect(() => {
    const bag = params.get("bag");
    if (!bag || lines.length) return;
    fetch(`/api/checkout/session?id=${encodeURIComponent(bag)}`)
      .then((r) => r.json())
      .then(({ lines: saved }: { lines: { slug: string; name: string; qty: number; priceKobo: number }[] }) => {
        sessionId.current = bag;
        saved.forEach((l) => {
          const p = products.find((x) => x.slug === l.slug);
          if (p) add({ slug: p.slug, name: p.name, subtitle: p.subtitle, priceKobo: p.priceKobo, image: p.cutout, accent: p.accent }, l.qty);
        });
      })
      .catch(() => {});
    // run once on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zone = zones.find((z) => z.id === zoneId);
  const subtotal = cartSubtotal(lines);
  const freeDelivery = freeDeliveryThresholdKobo !== null && subtotal >= freeDeliveryThresholdKobo;
  const fee = zone ? (freeDelivery ? 0 : zone.fee_kobo) : 0;
  const total = subtotal + fee;

  const eta = zone ? speedLabel(zone.eta_min_hours, zone.eta_max_hours).toLowerCase() : "";

  // Save the bag against the email as soon as we have one (abandoned-cart recovery)
  const saveSession = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email) || !lines.length) return;
    const res = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: sessionId.current,
        email,
        fullName: String(fd.get("fullName") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        lines: lines.map((l) => ({ slug: l.slug, name: l.name, qty: l.qty, priceKobo: l.priceKobo })),
      }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (json?.id) sessionId.current = json.id;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      email: String(fd.get("email")),
      phone: String(fd.get("phone")),
      fullName: String(fd.get("fullName")),
      zoneId,
      address: {
        line1: String(fd.get("line1")),
        area: String(fd.get("area")),
        city: String(fd.get("city")),
        state: String(fd.get("state")),
        landmark: String(fd.get("landmark") ?? "") || undefined,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
      },
      deliveryWindow: win,
      giftWrap,
      giftNote: giftWrap ? giftNote : undefined,
      marketingOptIn: fd.get("marketing") === "on",
      lines: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
      checkoutSessionId: sessionId.current,
    };
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(35_000) }).catch((e) => {
        throw new Error(e?.name === "TimeoutError" ? "Payment is taking too long to open — please check your connection and try again." : "We couldn’t reach the payment page — please check your connection and try again.");
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      // the bag is cleared on the confirmation page, only once payment is verified
      window.location.href = json.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (!mounted) return <div className="min-h-[60vh]" />;

  if (!lines.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <DropMascot mood="waiting" size={140} />
        <h1 className="title mt-6">Your bag is resting.</h1>
        <p className="lede mx-auto mt-4">Add an oil to begin checkout.</p>
        <Link href="/shop" className="btn btn-dark mt-8">Shop the oils</Link>
      </div>
    );
  }

  return (
    <form id="checkout-form" onSubmit={onSubmit} className="grid gap-12 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:grid-cols-12 lg:pb-0" noValidate={false}>
      {/* phones: a compact, expandable summary up top (like a native checkout) */}
      <div className="-mt-6 lg:hidden">
        <button type="button" onClick={() => setSummaryOpen((o) => !o)} aria-expanded={summaryOpen} className="pressable flex w-full items-center justify-between rounded-2xl bg-paper px-5 py-4">
          <span className="flex items-center gap-3 text-sm text-ink-soft">
            <span className="flex -space-x-3">
              {lines.slice(0, 3).map((l) => (
                <span key={l.slug} className="relative size-9 overflow-hidden rounded-full border-2 border-paper bg-cream-deep">
                  <Image src={l.image} alt="" fill sizes="36px" className="object-contain p-0.5" />
                </span>
              ))}
            </span>
            {summaryOpen ? "Hide" : "Show"} order summary
          </span>
          <span className="font-serif text-xl">{formatNaira(total)}</span>
        </button>
        <AnimatePresence initial={false}>
          {summaryOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 rounded-2xl bg-paper px-5 py-4">
                <ul className="space-y-2 text-sm">
                  {lines.map((l) => (
                    <li key={l.slug} className="flex justify-between"><span>{l.name} × {l.qty}</span><span>{formatNaira(l.priceKobo * l.qty)}</span></li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                  <Row label="Subtotal" value={formatNaira(subtotal)} />
                  <Row label="Delivery" value={freeDelivery ? "Free" : formatNaira(fee)} />
                </dl>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-12 md:space-y-14 lg:col-span-7">
        <Step n={1} title="Your details">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="email" type="email" required autoComplete="email" placeholder="Email address" className={`${field} sm:col-span-2`} onBlur={(e) => saveSession(e.currentTarget.form!)} />
            <input name="fullName" required autoComplete="name" placeholder="Full name" className={field} onBlur={(e) => saveSession(e.currentTarget.form!)} />
            <input name="phone" type="tel" required autoComplete="tel" placeholder="Phone (for your rider)" className={field} onBlur={(e) => saveSession(e.currentTarget.form!)} />
          </div>
        </Step>

        <Step n={2} title="Where should we deliver?">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery area">
            {zones.map((z) => (
              <button
                type="button"
                role="radio"
                aria-checked={zoneId === z.id}
                key={z.id}
                onClick={() => setZoneId(z.id)}
                className={`rounded-2xl border p-4 text-left transition ${zoneId === z.id ? "border-ink bg-paper shadow-soft" : "border-line hover:border-sand"}`}
              >
                <span className="flex items-center justify-between">
                  <span className="font-serif text-xl">{z.name}</span>
                  <span className="text-sm">{freeDelivery ? "Free" : z.fee_kobo ? formatNaira(z.fee_kobo) : "—"}</span>
                </span>
                {z.description && <span className="mt-1 block text-xs text-muted">{z.description}</span>}
                <span className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                  <RiderIcon size={14} /> {z.uses_courier ? "Courier" : "Our own riders"}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <input name="line1" required autoComplete="address-line1" placeholder="House number and street" className={`${field} sm:col-span-2`} />
            <input name="area" required autoComplete="address-level3" placeholder="Area (e.g. Lekki Phase 1)" className={field} />
            <input name="city" required autoComplete="address-level2" defaultValue="Lagos" placeholder="City" className={field} />
            <input name="state" required autoComplete="address-level1" defaultValue="Lagos" placeholder="State" className={field} />
            <input name="landmark" placeholder="Landmark (e.g. opposite the pharmacy)" className={field} />
          </div>
          <div className="mt-4">
            <PinMap value={pin} onChange={setPin} />
          </div>
        </Step>

        <Step n={3} title="When suits you?">
          <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Delivery window">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={win === w.id}
                onClick={() => setWin(w.id)}
                className={`rounded-2xl border p-4 text-center transition ${win === w.id ? "border-ink bg-paper shadow-soft" : "border-line hover:border-sand"}`}
              >
                <span className="block font-serif text-xl">{w.label}</span>
                <span className="text-xs text-muted">{w.hint}</span>
              </button>
            ))}
          </div>
          {zone && <p className="mt-4 text-sm text-ink-soft">Arrives {eta} after payment. You’ll get a delivery code to share with your rider.</p>}
        </Step>

        <Step n={4} title="A finishing touch">
          <label className="flex cursor-pointer items-start gap-3 text-ink-soft">
            <input type="checkbox" checked={giftWrap} onChange={(e) => setGift(e.target.checked)} className="mt-1 size-4 accent-amber" />
            Gift-wrap this order with a handwritten note
          </label>
          <AnimatePresence>
            {giftWrap && (
              <motion.textarea
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 96, opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                value={giftNote}
                onChange={(e) => setGift(true, e.target.value)}
                maxLength={240}
                placeholder="Your note…"
                className={`${field} resize-none`}
              />
            )}
          </AnimatePresence>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="marketing" defaultChecked className="mt-1 size-4 accent-amber" />
            <span>
              Keep me on the weekly ritual email — tips, new batches and first access.
              <span className="block text-xs text-muted">One email a week at most. Unsubscribe any time.</span>
            </span>
          </label>
        </Step>
      </div>

      <aside className="hidden lg:col-span-5 lg:block">
        <div className="rounded-[32px] bg-paper p-7 lg:sticky lg:top-28 md:p-9">
          <h2 className="font-serif text-3xl">Your order</h2>
          <ul className="mt-6 space-y-4">
            {lines.map((l: CartLine) => (
              <li key={l.slug} className="flex items-center gap-4">
                <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-deep">
                  <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" />
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] text-paper">{l.qty}</span>
                </span>
                <span className="flex-1 font-serif text-lg leading-tight">{l.name}</span>
                <span className="text-sm">{formatNaira(l.priceKobo * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
            <Row label="Subtotal" value={formatNaira(subtotal)} />
            <Row label={`Delivery${zone ? ` · ${zone.name}` : ""}`} value={freeDelivery ? "Free" : formatNaira(fee)} />
            {giftWrap && <Row label="Gift wrap" value="Included" />}
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="eyebrow">Total</span>
            <span className="font-serif text-3xl">{formatNaira(total)}</span>
          </div>
          {error && <p role="alert" className="mt-5 rounded-2xl bg-[#f6e1d8] px-4 py-3 text-sm text-[#7a2e12]">{error}</p>}
          <button type="submit" disabled={submitting || !zone} className="btn btn-dark mt-6 w-full disabled:opacity-60">
            {submitting ? "Opening secure payment…" : `Pay ${formatNaira(total)}`}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
            <CheckIcon size={14} /> Secure payment by Flutterwave · card, transfer or USSD
          </p>
        </div>
      </aside>

      {/* phones: the pay button lives in the thumb zone */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        {error && <p role="alert" className="mb-2 rounded-xl bg-[#f6e1d8] px-3 py-2 text-sm text-[#7a2e12]">{error}</p>}
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.14em] text-muted uppercase">Total</p>
            <p className="font-serif text-2xl leading-none">{formatNaira(total)}</p>
          </div>
          <button type="submit" disabled={submitting || !zone} className="btn btn-dark pressable flex-1 disabled:opacity-60">
            {submitting ? "Opening payment…" : "Pay securely"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow">Step {n}</p>
      <h2 className="mt-2 mb-6 font-serif text-3xl md:text-4xl">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-soft">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
