import { lateApologyEmail, orderConfirmationEmail, sendEmail, statusEmail } from "./email";
import type { VerifiedTx } from "./flutterwave";
import { supabaseAdmin } from "./supabase/admin";

/* Server-side order service. Prices always come from the database — whatever
   the browser sends is only a list of slugs and quantities. */

export type Zone = {
  id: string;
  name: string;
  description: string | null;
  fee_kobo: number;
  eta_min_hours: number;
  eta_max_hours: number;
  uses_courier: boolean;
};

export async function getZones(): Promise<Zone[]> {
  const { data, error } = await supabaseAdmin()
    .from("delivery_zones")
    .select("id, name, description, fee_kobo, eta_min_hours, eta_max_hours, uses_courier")
    .eq("is_active", true)
    .order("sort");
  if (error) throw error;
  return data ?? [];
}

export type CheckoutInput = {
  email: string;
  phone: string;
  fullName: string;
  zoneId: string;
  address: { line1: string; area: string; city: string; state: string; landmark?: string; lat?: number | null; lng?: number | null };
  deliveryWindow: "morning" | "afternoon" | "evening";
  giftWrap: boolean;
  giftNote?: string;
  marketingOptIn: boolean;
  lines: { slug: string; qty: number }[];
  checkoutSessionId?: string | null;
};

export async function createOrder(input: CheckoutInput) {
  const db = supabaseAdmin();

  const slugs = [...new Set(input.lines.map((l) => l.slug))];
  const { data: products, error: pErr } = await db
    .from("storefront_products")
    .select("id, slug, name, price_kobo, stock_available")
    .in("slug", slugs);
  if (pErr) throw pErr;

  const items = input.lines.map((l) => {
    const p = products?.find((x) => x.slug === l.slug);
    if (!p) throw new UserError(`“${l.slug}” is no longer available.`);
    if (p.stock_available !== null && p.stock_available < l.qty) throw new UserError(`Only ${p.stock_available} of ${p.name} left in this batch.`);
    return { product_id: p.id, slug: p.slug, name: p.name, unit_price_kobo: p.price_kobo, qty: l.qty };
  });

  const { data: zone, error: zErr } = await db.from("delivery_zones").select("*").eq("id", input.zoneId).eq("is_active", true).single();
  if (zErr || !zone) throw new UserError("Please choose a delivery area.");

  const subtotal = items.reduce((n, i) => n + i.unit_price_kobo * i.qty, 0);
  const { data: settings } = await db.from("site_settings").select("value").eq("key", "storefront").maybeSingle();
  const threshold = (settings?.value as { freeDeliveryThresholdKobo?: number | null } | null)?.freeDeliveryThresholdKobo ?? null;
  const deliveryFee = threshold && subtotal >= threshold ? 0 : zone.fee_kobo;

  const { data: customer, error: cErr } = await db
    .from("customers")
    .upsert(
      { email: input.email, phone: input.phone, full_name: input.fullName, ...(input.marketingOptIn ? { marketing_opt_in: true } : {}) },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (cErr) throw cErr;

  const promisedBy = new Date(Date.now() + zone.eta_max_hours * 3600_000).toISOString();

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      customer_id: customer.id,
      email: input.email,
      phone: input.phone,
      full_name: input.fullName,
      subtotal_kobo: subtotal,
      delivery_fee_kobo: deliveryFee,
      total_kobo: subtotal + deliveryFee,
      zone_id: zone.id,
      address: input.address,
      delivery_window: input.deliveryWindow,
      promised_by: promisedBy,
      gift_wrap: input.giftWrap,
      gift_note: input.giftWrap ? input.giftNote?.slice(0, 240) ?? null : null,
    })
    .select("id, ref, tracking_token, total_kobo")
    .single();
  if (oErr) throw oErr;

  const { error: iErr } = await db.from("order_items").insert(items.map((i) => ({ ...i, order_id: order.id })));
  if (iErr) throw iErr;

  if (input.checkoutSessionId) {
    await db.from("checkout_sessions").update({ order_id: order.id }).eq("id", input.checkoutSessionId);
  }
  return order;
}

/** Idempotent: safe to call from both the redirect and the webhook. */
export async function markOrderPaid(tx: VerifiedTx) {
  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("id, status, total_kobo, currency").eq("ref", tx.tx_ref).maybeSingle();
  if (!order) return { ok: false as const, reason: "unknown order" };
  if (order.status !== "pending_payment") return { ok: true as const, orderId: order.id, already: true };

  const expected = order.total_kobo / 100;
  if (tx.status !== "successful" || tx.currency !== order.currency || Number(tx.amount) < expected) {
    await db.from("order_events").insert({ order_id: order.id, kind: "payment", message: `Payment check failed: ${tx.status} ${tx.currency} ${tx.amount}` });
    return { ok: false as const, reason: "payment mismatch" };
  }

  // Only the first caller flips the status; a racing webhook/redirect gets zero rows
  const { data: updated } = await db
    .from("orders")
    .update({ status: "paid", provider_tx_id: String(tx.id), payment_ref: tx.tx_ref })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id");
  if (!updated?.length) return { ok: true as const, orderId: order.id, already: true };

  await db.rpc("allocate_stock", { p_order: order.id });
  await db.from("checkout_sessions").update({ status: "converted" }).eq("order_id", order.id);

  const full = await getOrderForEmail(order.id);
  if (full) {
    const mail = orderConfirmationEmail(full);
    await sendEmail({ to: full.email, subject: mail.subject, html: mail.html, tag: "order_confirmation" });
  }
  return { ok: true as const, orderId: order.id, already: false };
}

export async function getOrderForEmail(orderId: string) {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("ref, full_name, email, tracking_token, subtotal_kobo, delivery_fee_kobo, discount_kobo, total_kobo, delivery_code, items:order_items(name, qty, unit_price_kobo)")
    .eq("id", orderId)
    .single();
  return data;
}

export async function notifyStatus(orderId: string, status: string) {
  if (status !== "out_for_delivery" && status !== "delivered" && status !== "failed") return;
  const o = await getOrderForEmail(orderId);
  if (!o) return;
  const mail = statusEmail(o, status);
  await sendEmail({ to: o.email, subject: mail.subject, html: mail.html, tag: `status_${status}` });
}

export async function sendLateApology(orderId: string, voucher: string | null) {
  const o = await getOrderForEmail(orderId);
  if (!o) return;
  const mail = lateApologyEmail(o, voucher);
  await sendEmail({ to: o.email, subject: mail.subject, html: mail.html, tag: "late_apology" });
  await supabaseAdmin().from("orders").update({ apology_sent_at: new Date().toISOString() }).eq("id", orderId);
}

export class UserError extends Error {}
