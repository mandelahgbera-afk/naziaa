import type { Metadata } from "next";
import Link from "next/link";
import { DropMascot, type DropMood } from "@/components/drop-mascot";
import { LiveRiderMap } from "@/components/orders/live-rider-map";
import { RateDelivery, ReportIssue } from "@/components/orders/order-feedback";
import { formatNaira } from "@/lib/catalog";
import { getTrackedOrder } from "@/lib/tracking";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

const STAGES = [
  { key: "paid", label: "Confirmed", at: "paid_at" },
  { key: "packed", label: "Prepared by hand", at: null },
  { key: "assigned", label: "With your rider", at: "assigned_at" },
  { key: "out_for_delivery", label: "On the way", at: "out_for_delivery_at" },
  { key: "delivered", label: "Delivered", at: "delivered_at" },
] as const;
const ORDER = ["pending_payment", "paid", "packed", "assigned", "out_for_delivery", "delivered"];

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-NG", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "");

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[ref]">) {
  const { ref } = await params;
  const t = (await searchParams).t;
  const token = typeof t === "string" ? t : null;
  const order = await getTrackedOrder(ref, token);

  if (!order || !token) {
    return (
      <section className="wrap flex min-h-[80svh] flex-col items-center justify-center pt-32 text-center">
        <DropMascot mood="oops" size={130} />
        <h1 className="title mt-8">We couldn’t find that order.</h1>
        <p className="lede mx-auto mt-4">Use the link in your confirmation email, or look it up with your order number.</p>
        <Link href="/track" className="btn btn-dark mt-8">Find my order</Link>
      </section>
    );
  }

  const idx = ORDER.indexOf(order.status);
  const mood: DropMood = order.status === "delivered" ? "happy" : order.status === "failed" ? "oops" : order.status === "out_for_delivery" ? "idle" : "thinking";
  const address = order.address as { line1?: string; area?: string; city?: string; lat?: number | null; lng?: number | null; landmark?: string };
  const destination = address.lat && address.lng ? { lat: address.lat, lng: address.lng } : null;
  const rider = Array.isArray(order.rider) ? order.rider[0] : order.rider;
  const late = order.promised_by && new Date(order.promised_by) < new Date() && !["delivered", "failed", "cancelled", "refunded", "returned"].includes(order.status);
  const headline =
    order.status === "pending_payment" ? "Waiting for payment." :
    order.status === "delivered" ? "Delivered. Enjoy your ritual." :
    order.status === "out_for_delivery" ? `${rider?.name?.split(" ")[0] ?? "Your rider"} is on the way.` :
    order.status === "failed" ? "We missed you today." :
    ["cancelled", "refunded", "returned"].includes(order.status) ? `Order ${order.status}.` :
    "Your oils are being prepared.";

  return (
    <section className="wrap pt-36 pb-28 md:pt-44">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-5">
            <DropMascot mood={mood} size={80} label="" />
            <div>
              <p className="eyebrow">Order {order.ref}</p>
              <h1 className="mt-2 font-serif text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.02]">{headline}</h1>
            </div>
          </div>

          {late && <p className="mt-6 rounded-2xl bg-[#f6e6d2] px-5 py-3 text-sm text-ink-soft">This is taking longer than we promised. It’s being looked after personally — thank you for your patience.</p>}

          <ol className="relative mt-12 space-y-0">
            {STAGES.map((s, i) => {
              const done = idx >= ORDER.indexOf(s.key);
              const current = ORDER[idx] === s.key;
              const at = s.at ? (order as Record<string, unknown>)[s.at] as string | null : null;
              return (
                <li key={s.key} className="relative flex gap-5 pb-8 last:pb-0">
                  {i < STAGES.length - 1 && <span className={`absolute top-6 left-[11px] h-full w-px ${done && idx > ORDER.indexOf(s.key) ? "bg-amber" : "bg-line"}`} />}
                  <span className={`relative z-10 mt-1 grid size-6 shrink-0 place-items-center rounded-full border-2 ${done ? "border-amber bg-amber" : "border-line bg-cream"}`}>
                    {current && <span className="absolute inset-0 animate-ping rounded-full bg-honey/50" />}
                    {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fffaf5" strokeWidth="3"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
                  </span>
                  <div>
                    <p className={`font-serif text-2xl ${done ? "text-ink" : "text-muted"}`}>{s.label}</p>
                    {at && <p className="text-sm text-muted">{fmt(at)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>

          {order.status === "out_for_delivery" && (
            <div className="mt-12">
              <LiveRiderMap ref_={order.ref} token={token} destination={destination} />
            </div>
          )}

          {["assigned", "out_for_delivery"].includes(order.status) && (
            <div className="mt-8 rounded-[28px] bg-dark p-7 text-paper">
              <p className="eyebrow text-paper/60">Your delivery code</p>
              <p className="mt-2 font-serif text-5xl tracking-[0.3em] text-honey">{order.delivery_code}</p>
              <p className="mt-3 text-sm text-paper/70">Share it with your rider only once your order is in your hands.</p>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {order.status === "delivered" && <RateDelivery ref_={order.ref} token={token} initial={order.delivery_rating} />}
            {order.status !== "pending_payment" && <ReportIssue ref_={order.ref} token={token} />}
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="rounded-[32px] bg-paper p-8 lg:sticky lg:top-28">
            <p className="eyebrow">Delivering to</p>
            <p className="mt-2 font-serif text-2xl">{order.full_name}</p>
            <p className="text-ink-soft">{[address.line1, address.area, address.city].filter(Boolean).join(", ")}</p>
            {address.landmark && <p className="text-sm text-muted">Landmark: {address.landmark}</p>}
            {order.delivery_window && <p className="mt-2 text-sm text-muted capitalize">{order.delivery_window} window</p>}
            <ul className="mt-6 space-y-2 border-t border-line pt-5">
              {order.items.map((i) => (
                <li key={i.slug} className="flex justify-between text-ink-soft">
                  <span>{i.name} × {i.qty}</span>
                  <span>{formatNaira(i.unit_price_kobo * i.qty)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex justify-between border-t border-line pt-5 font-serif text-2xl">
              <span>Total</span>
              <span>{formatNaira(order.total_kobo)}</span>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
