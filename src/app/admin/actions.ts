"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireStaff } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { createDirectUpload } from "@/lib/mux";
import { notifyStatus } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong" });

async function audit(actor: string, action: string, entity: string, entityId: string | null, detail?: unknown) {
  await supabaseAdmin().from("audit_log").insert({ actor, action, entity, entity_id: entityId, detail: detail ?? null });
}

function refreshStore() {
  revalidatePath("/", "layout");
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export async function advanceOrder(orderId: string, to: string, note?: string): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { error } = await supabase.rpc("advance_order", { p_order: orderId, p_to: to, p_note: note || null });
    if (error) throw error;
    await notifyStatus(orderId, to);
    await audit(user.id, "order.status", "order", orderId, { to, note });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function assignRider(orderId: string, riderId: string): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { data: order, error } = await supabase.from("orders").update({ rider_id: riderId }).eq("id", orderId).select("status").single();
    if (error) throw error;
    if (order.status === "packed" || order.status === "failed") {
      const { error: e2 } = await supabase.rpc("advance_order", { p_order: orderId, p_to: "assigned" });
      if (e2) throw e2;
    }
    await audit(user.id, "order.assign", "order", orderId, { riderId });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addOrderNote(orderId: string, note: string): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { error } = await supabase.from("order_events").insert({ order_id: orderId, kind: "note", message: note.slice(0, 1000), actor: user.id });
    if (error) throw error;
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Riders ──────────────────────────────────────────────────────────────────
const RiderInput = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  zoneId: z.string().uuid().nullable(),
  vehicle: z.string().trim().max(40).optional(),
});

export async function createRider(input: z.input<typeof RiderInput>): Promise<Result> {
  try {
    const { user } = await requireStaff();
    const data = RiderInput.parse(input);
    const admin = supabaseAdmin();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (error) throw error;
    const uid = created.user.id;
    await admin.from("profiles").upsert({ id: uid, role: "rider", full_name: data.name, phone: data.phone });
    const { error: rErr } = await admin.from("riders").insert({ profile_id: uid, name: data.name, phone: data.phone, zone_id: data.zoneId, vehicle: data.vehicle || null });
    if (rErr) throw rErr;
    await audit(user.id, "rider.create", "rider", uid, { name: data.name });
    revalidatePath("/admin/riders");
    return { ok: true, message: `${data.name} can now sign in at /rider` };
  } catch (e) {
    return fail(e);
  }
}

export async function setRiderActive(riderId: string, active: boolean): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { error } = await supabase.from("riders").update({ is_active: active }).eq("id", riderId);
    if (error) throw error;
    await audit(user.id, active ? "rider.activate" : "rider.deactivate", "rider", riderId);
    revalidatePath("/admin/riders");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Products & batches ──────────────────────────────────────────────────────
const ProductInput = z.object({
  name: z.string().trim().min(2).max(80),
  subtitle: z.string().trim().max(120),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(1200),
  priceNaira: z.number().int().min(0).max(10_000_000),
  sizeMl: z.number().int().min(1).max(5000),
  status: z.enum(["draft", "active", "archived"]),
  trackInventory: z.boolean(),
  lowStockThreshold: z.number().int().min(0).max(10000),
});

export async function updateProduct(id: string, input: z.input<typeof ProductInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const d = ProductInput.parse(input);
    const { error } = await supabase
      .from("products")
      .update({
        name: d.name,
        subtitle: d.subtitle,
        tagline: d.tagline,
        description: d.description,
        price_kobo: d.priceNaira * 100,
        size_ml: d.sizeMl,
        status: d.status,
        track_inventory: d.trackInventory,
        low_stock_threshold: d.lowStockThreshold,
      })
      .eq("id", id);
    if (error) throw error;
    await audit(user.id, "product.update", "product", id, d);
    refreshStore();
    return { ok: true, message: "Saved — the shop updates within a minute." };
  } catch (e) {
    return fail(e);
  }
}

const BatchInput = z.object({
  code: z.string().trim().min(1).max(24),
  infusedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  qty: z.number().int().min(0).max(100000),
  notes: z.string().max(500).optional(),
});

export async function createBatch(productId: string, input: z.input<typeof BatchInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const d = BatchInput.parse(input);
    const { error } = await supabase.from("batches").insert({
      product_id: productId,
      code: d.code,
      infused_on: d.infusedOn,
      expires_on: d.expiresOn || null,
      qty_produced: d.qty,
      qty_available: d.qty,
      notes: d.notes || null,
    });
    if (error) throw error;
    await audit(user.id, "batch.create", "product", productId, d);
    refreshStore();
    return { ok: true, message: `Batch ${d.code} added.` };
  } catch (e) {
    return fail(e);
  }
}

export async function adjustBatch(batchId: string, qtyAvailable: number): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { error } = await supabase.from("batches").update({ qty_available: Math.max(0, Math.floor(qtyAvailable)) }).eq("id", batchId);
    if (error) throw error;
    await audit(user.id, "batch.adjust", "batch", batchId, { qtyAvailable });
    refreshStore();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Hero video ──────────────────────────────────────────────────────────────
export async function startHeroUpload(title: string): Promise<{ ok: true; url: string; heroId: string } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireStaff();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const upload = await createDirectUpload(origin);
    const { data, error } = await supabase.from("hero_videos").insert({ title: title || "Hero video", mux_upload_id: upload.id, status: "waiting" }).select("id").single();
    if (error) throw error;
    await audit(user.id, "hero.upload", "hero_video", data.id);
    return { ok: true, url: upload.url, heroId: data.id };
  } catch (e) {
    const r = fail(e);
    return { ok: false, error: r.ok ? "" : r.error };
  }
}

const HeroInput = z.object({
  title: z.string().trim().max(80),
  tint: z.number().min(0).max(0.9),
  focalX: z.number().min(0).max(1),
  focalY: z.number().min(0).max(1),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  priority: z.number().int().min(0).max(100),
  mobilePlaybackId: z.string().trim().max(80).nullable(),
});

export async function updateHero(id: string, input: z.input<typeof HeroInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const d = HeroInput.parse(input);
    const { error } = await supabase
      .from("hero_videos")
      .update({ title: d.title, tint: d.tint, focal_x: d.focalX, focal_y: d.focalY, starts_at: d.startsAt, ends_at: d.endsAt, priority: d.priority, mobile_playback_id: d.mobilePlaybackId })
      .eq("id", id);
    if (error) throw error;
    await audit(user.id, "hero.update", "hero_video", id, d);
    refreshStore();
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function setHeroLive(id: string, live: boolean): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { error } = await supabase.from("hero_videos").update({ is_active: live }).eq("id", id);
    if (error) throw error;
    await audit(user.id, live ? "hero.live" : "hero.off", "hero_video", id);
    refreshStore();
    return { ok: true, message: live ? "Live on the homepage." : "Taken off the homepage." };
  } catch (e) {
    return fail(e);
  }
}

// ─── Complaints ──────────────────────────────────────────────────────────────
export async function resolveComplaint(id: string, resolution: "refund" | "replacement" | "store_credit" | "none", note: string, amountNaira?: number): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { error } = await supabase
      .from("complaints")
      .update({ status: "resolved", resolution, resolution_note: note || null, amount_kobo: amountNaira ? Math.round(amountNaira * 100) : null, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await audit(user.id, "complaint.resolve", "complaint", id, { resolution, note });
    revalidatePath("/admin/complaints");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setComplaintStatus(id: string, status: "open" | "in_progress"): Promise<Result> {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase.from("complaints").update({ status }).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/complaints");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Settings & delivery ─────────────────────────────────────────────────────
// Each settings section saves on its own; unspecified fields keep their current value
const SettingsInput = z
  .object({
    announcements: z.array(z.string().trim().min(1).max(90, "Keep each announcement under 90 characters")).max(6),
    freeDeliveryThresholdNaira: z.number().int().min(0).nullable(),
    whatsappNumber: z.string().trim().regex(/^d{8,15}$/, "WhatsApp number: digits with country code, e.g. 2348012345678").nullable(),
    contactEmail: z.string().trim().toLowerCase().email("Enter a valid contact email"),
    instagram: z.string().trim().url("Instagram must be a full link, e.g. https://www.instagram.com/nazia.botanics/").or(z.literal("")),
    tiktok: z.string().trim().url("TikTok must be a full link, e.g. https://www.tiktok.com/@nazia_botanics").or(z.literal("")),
  })
  .partial();

export async function saveStorefrontSettings(input: z.input<typeof SettingsInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const parsed = SettingsInput.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the settings");
    const d = parsed.data;
    const { data: current } = await supabase.from("site_settings").select("value").eq("key", "storefront").maybeSingle();
    const value: Record<string, unknown> = { ...((current?.value as Record<string, unknown>) ?? {}) };
    if (d.announcements !== undefined) value.announcements = d.announcements;
    if (d.freeDeliveryThresholdNaira !== undefined) value.freeDeliveryThresholdKobo = d.freeDeliveryThresholdNaira ? d.freeDeliveryThresholdNaira * 100 : null;
    if (d.whatsappNumber !== undefined) value.whatsappNumber = d.whatsappNumber;
    if (d.contactEmail !== undefined) value.contactEmail = d.contactEmail;
    if (d.instagram !== undefined) value.instagram = d.instagram;
    if (d.tiktok !== undefined) value.tiktok = d.tiktok;
    const { error } = await supabase.from("site_settings").upsert({ key: "storefront", value, is_public: true });
    if (error) throw error;
    await audit(user.id, "settings.storefront", "site_settings", "storefront", d);
    refreshStore();
    revalidatePath("/admin/settings");
    return { ok: true, message: "Saved — live on the site within a minute." };
  } catch (e) {
    return fail(e);
  }
}

const ZoneInput = z.object({
  name: z.string().trim().min(2, "Give the area a name").max(60),
  neighbourhoods: z.array(z.string().trim().min(1).max(40)).max(30),
  feeNaira: z.number().int().min(0).max(1_000_000),
  etaMinHours: z.number().int().min(1).max(720),
  etaMaxHours: z.number().int().min(1).max(720),
  usesCourier: z.boolean(),
  isActive: z.boolean(),
});

export async function saveZone(id: string | null, input: z.input<typeof ZoneInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const parsed = ZoneInput.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the delivery area");
    const d = parsed.data;
    const row = {
      name: d.name,
      description: d.neighbourhoods.length ? d.neighbourhoods.join(", ") : null,
      fee_kobo: d.feeNaira * 100,
      eta_min_hours: Math.min(d.etaMinHours, d.etaMaxHours),
      eta_max_hours: Math.max(d.etaMinHours, d.etaMaxHours),
      uses_courier: d.usesCourier,
      is_active: d.isActive,
    };
    if (id) {
      const { error } = await supabase.from("delivery_zones").update(row).eq("id", id);
      if (error) throw error;
    } else {
      // new areas go to the end of the list
      const { data: last } = await supabase.from("delivery_zones").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
      const { error } = await supabase.from("delivery_zones").insert({ ...row, sort: (last?.sort ?? 0) + 1 });
      if (error) throw error;
    }
    await audit(user.id, "zone.save", "delivery_zone", id, row);
    revalidatePath("/admin/settings");
    return { ok: true, message: `${d.name} saved — checkout uses it straight away.` };
  } catch (e) {
    return fail(e);
  }
}

export async function setZoneActive(id: string, active: boolean): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { error } = await supabase.from("delivery_zones").update({ is_active: active }).eq("id", id);
    if (error) throw error;
    await audit(user.id, active ? "zone.show" : "zone.hide", "delivery_zone", id);
    revalidatePath("/admin/settings");
    return { ok: true, message: active ? "Shown at checkout." : "Hidden from checkout." };
  } catch (e) {
    return fail(e);
  }
}

/** Saves the order areas appear in at checkout. */
export async function reorderZones(ids: string[]): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const ok = z.array(z.string().uuid()).max(100).safeParse(ids);
    if (!ok.success) throw new Error("Couldn’t reorder");
    await Promise.all(ok.data.map((id, i) => supabase.from("delivery_zones").update({ sort: i + 1 }).eq("id", id)));
    await audit(user.id, "zone.reorder", "delivery_zone", null, { ids });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Order saved." };
  } catch (e) {
    return fail(e);
  }
}

/** Deletes an area only if no order ever used it; otherwise it can be hidden instead. */
export async function deleteZone(id: string): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("zone_id", id);
    if (count) throw new Error(`${count} order${count === 1 ? " uses" : "s use"} this area — hide it instead so their history stays intact.`);
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) throw error;
    await audit(user.id, "zone.delete", "delivery_zone", id);
    revalidatePath("/admin/settings");
    return { ok: true, message: "Area deleted." };
  } catch (e) {
    return fail(e);
  }
}

// ─── Newsletter ──────────────────────────────────────────────────────────────
export async function sendNewsletter(subject: string, bodyText: string, testOnly: boolean): Promise<Result> {
  try {
    const { user } = testOnly ? await requireStaff() : await requireOwner();
    if (subject.trim().length < 3 || bodyText.trim().length < 20) throw new Error("Add a subject and a few lines of copy.");
    const { newsletterEmail, unsubscribeUrl } = await import("@/lib/newsletter");

    if (testOnly) {
      const html = newsletterEmail(subject, bodyText, unsubscribeUrl(user.email!));
      await sendEmail({ to: user.email!, subject: `[Test] ${subject}`, html, tag: "newsletter_test" });
      return { ok: true, message: `Test sent to ${user.email}` };
    }

    const { data: subs, error } = await supabaseAdmin().from("newsletter_subscribers").select("email").eq("status", "subscribed");
    if (error) throw error;
    let sent = 0;
    for (const s of subs ?? []) {
      const unsub = unsubscribeUrl(s.email);
      const html = newsletterEmail(subject, bodyText, unsub);
      // one-click unsubscribe headers: required by Gmail and Yahoo for bulk senders
      const r = await sendEmail({ to: s.email, subject, html, tag: "newsletter", headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
      if (!r.skipped && !r.error) sent++;
      // stay under the email provider rate limit
      await new Promise((res) => setTimeout(res, 550));
    }
    await audit(user.id, "newsletter.send", "newsletter", null, { subject, recipients: subs?.length ?? 0, sent });
    return { ok: true, message: `Sent to ${sent} of ${subs?.length ?? 0} subscribers.` };
  } catch (e) {
    return fail(e);
  }
}
