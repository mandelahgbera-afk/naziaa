import webpush from "web-push";
import { adminHref } from "./admin-path";
import { formatNaira } from "./catalog";
import { supabaseAdmin } from "./supabase/admin";

/* Studio notifications on the team's phones (Web Push, signed with the shop's VAPID keys from Vercel).
   Each phone chose what it wants to hear about. A phone that unsubscribed or was reset (404/410) is forgotten.
   Words are lock-screen safe: an order ref, an amount, a first name, an area — never a phone number or email.
   Server-only (the service-role client refuses to run in a browser). */

export type PushKind = "order" | "complaint" | "delivery" | "stock" | "test";
export type PushMessage = { title: string; body: string; url: string; tag?: string };

export const PUSH_KINDS: { id: Exclude<PushKind, "test">; label: string; hint: string }[] = [
  { id: "order", label: "New orders", hint: "The moment a payment clears, or if one needs a look." },
  { id: "complaint", label: "Customer care", hint: "When a customer raises something from their order page." },
  { id: "delivery", label: "Deliveries that didn’t happen", hint: "When a rider marks a delivery as failed." },
  { id: "stock", label: "Running low", hint: "When an oil drops to its low-stock alert." },
];

export const pushReady = () => !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

let configured = false;
function vapid() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@naziabotanics.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** Sends to every staff phone that wants this kind (or to one phone, for a test). Never throws. */
export async function pushToStaff(kind: PushKind, msg: PushMessage, onlyEndpoint?: string): Promise<{ sent: number; failed: number }> {
  if (!pushReady()) return { sent: 0, failed: 0 };
  try {
    vapid();
    const db = supabaseAdmin();
    let q = db.from("push_subscriptions").select("endpoint, p256dh, auth, kinds");
    if (onlyEndpoint) q = q.eq("endpoint", onlyEndpoint);
    const { data } = await q;
    const subs = (data ?? []).filter((s) => kind === "test" || (s.kinds as string[]).includes(kind));
    let sent = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ ...msg, kind }),
            { TTL: 60 * 60 * 24, urgency: kind === "stock" ? "normal" : "high" },
          );
          sent++;
          await db.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("endpoint", s.endpoint);
        } catch (e) {
          failed++;
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          else console.error("push failed", code ?? e);
        }
      }),
    );
    return { sent, failed };
  } catch (e) {
    console.error("push failed", e);
    return { sent: 0, failed: 0 };
  }
}

const firstName = (full: string | null | undefined) => (full ?? "").trim().split(/\s+/)[0] || "a customer";

const CARE: Record<string, string> = {
  late: "Running late",
  damaged: "Arrived damaged",
  wrong_item: "Wrong item",
  skin_reaction: "Skin reaction",
  missing: "Something missing",
  other: "Something else",
};

/** The words for each moment. */
export const pushWords = {
  paid: (o: { id: string; ref: string; total_kobo: number; full_name: string | null; zone: string | null; items: number }): PushMessage => ({
    title: `New order · ${o.ref}`,
    body: [formatNaira(o.total_kobo), `${o.items} ${o.items === 1 ? "bottle" : "bottles"}`, o.zone, `for ${firstName(o.full_name)}`].filter(Boolean).join(" · "),
    url: adminHref(`/orders/${o.id}`),
    tag: `order-${o.id}`,
  }),
  paymentIssue: (o: { id: string; ref: string }): PushMessage => ({
    title: `Payment needs a look · ${o.ref}`,
    body: "The amount paid didn’t match the order. Check it before packing.",
    url: adminHref(`/orders/${o.id}`),
    tag: `pay-${o.id}`,
  }),
  complaint: (c: { orderId: string; ref: string; category: string }): PushMessage => ({
    title: `A customer needs you · ${c.ref}`,
    body: `${CARE[c.category] ?? "Something else"}, raised from their order page.`,
    url: adminHref("/complaints"),
    tag: `care-${c.orderId}`,
  }),
  failed: (o: { id: string; ref: string }): PushMessage => ({
    title: `Delivery didn’t happen · ${o.ref}`,
    body: "The rider marked it as failed. Choose what happens next.",
    url: adminHref(`/orders/${o.id}`),
    tag: `failed-${o.id}`,
  }),
  low: (p: { id: string; name: string; left: number }): PushMessage => ({
    title: `Running low · ${p.name}`,
    body: p.left === 0 ? "Sold out across every batch." : `${p.left} ${p.left === 1 ? "bottle" : "bottles"} left across batches. Time to plan the next infusion.`,
    url: adminHref("/products"),
    tag: `low-${p.id}`,
  }),
};

/** After a paid order: tell the team, and say so if it took an oil down to its low-stock alert. */
export async function pushPaidOrder(orderId: string) {
  if (!pushReady()) return;
  const db = supabaseAdmin();
  const { data: o } = await db
    .from("orders")
    .select("id, ref, total_kobo, full_name, zone:delivery_zones(name), items:order_items(product_id, qty)")
    .eq("id", orderId)
    .single();
  if (!o) return;
  const items = (o.items ?? []) as { product_id: string; qty: number }[];
  await pushToStaff(
    "order",
    pushWords.paid({
      id: o.id,
      ref: o.ref,
      total_kobo: o.total_kobo,
      full_name: o.full_name,
      zone: (o.zone as { name?: string } | null)?.name ?? null,
      items: items.reduce((n, i) => n + i.qty, 0),
    }),
  );

  // only when this order crossed the line, so it isn't repeated on every sale
  const ids = [...new Set(items.map((i) => i.product_id))];
  if (!ids.length) return;
  const { data: products } = await db.from("products").select("id, name, track_inventory, low_stock_threshold, batches(qty_available)").in("id", ids);
  for (const p of products ?? []) {
    if (!p.track_inventory) continue;
    const left = ((p.batches ?? []) as { qty_available: number }[]).reduce((n, b) => n + b.qty_available, 0);
    const bought = items.filter((i) => i.product_id === p.id).reduce((n, i) => n + i.qty, 0);
    if (left <= p.low_stock_threshold && left + bought > p.low_stock_threshold) {
      await pushToStaff("stock", pushWords.low({ id: p.id, name: p.name, left }));
    }
  }
}
