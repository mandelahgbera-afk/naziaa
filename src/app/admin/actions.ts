"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireStaff } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { createDirectUpload } from "@/lib/mux";
import { notifyStatus } from "@/lib/orders";
import { isWhatsApp, toWhatsApp } from "@/lib/social";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Result = { ok: true; message?: string } | { ok: false; error: string };
/* Every failure becomes one plain sentence she can act on — never raw JSON or database jargon. */
const FIELD_NAMES: Record<string, string> = {
  name: "Name", phone: "Phone", email: "Email", password: "Password", zoneId: "Home zone", vehicle: "Vehicle",
  subtitle: "Subtitle", tagline: "Tagline", description: "Description", priceNaira: "Price", sizeMl: "Size",
  lowStockThreshold: "Low-stock alert", code: "Batch code", infusedOn: "Infused date", expiresOn: "Best-before date", qty: "Bottles",
  title: "Title", tint: "Tint", startsAt: "Show from", endsAt: "Until", priority: "Priority", mobilePlaybackId: "Phone cut",
  announcements: "Announcements", freeDeliveryThresholdNaira: "Free delivery amount", whatsappNumber: "WhatsApp number",
  contactEmail: "Contact email", orderAlertEmail: "Order alert email", instagram: "Instagram", tiktok: "TikTok", neighbourhoods: "Neighbourhoods", feeNaira: "Delivery fee", benefits: "Benefits", howToUse: "How to use", cutoutUrl: "Bottle photo", squareUrl: "Lifestyle photo",
};

function humanIssue(issue: z.core.$ZodIssue) {
  const field = FIELD_NAMES[String(issue.path[0] ?? "")] ?? "This field";
  // our own messages are already written for people
  if (issue.code === "custom" || /[a-z] /.test(issue.message) && !/^(Invalid|Too |Expected)/.test(issue.message)) return issue.message;
  switch (issue.code) {
    case "too_small": return `${field} is too short.`;
    case "too_big": return `${field} is too long.`;
    case "invalid_type": return `${field} is missing or not a valid value.`;
    case "invalid_format": return `${field} isn’t in the right format.`;
    default: return `Please check ${field.toLowerCase()}.`;
  }
}

const fail = (e: unknown): Result => {
  if (e instanceof z.ZodError) return { ok: false, error: humanIssue(e.issues[0]) };
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (/row-level security|permission denied/i.test(msg)) return { ok: false, error: "Your account doesn’t have permission to change this." };
  if (/duplicate key|already exists|already been registered/i.test(msg)) return { ok: false, error: "That already exists — try a different name, code or email." };
  if (/fetch failed|network|timeout/i.test(msg)) return { ok: false, error: "Couldn’t reach the server — check your connection and try again." };
  if (/JWT|session|not authenticated/i.test(msg)) return { ok: false, error: "You’ve been signed out. Please sign in again." };
  return { ok: false, error: msg || "Something went wrong — please try again." };
};

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
const Benefit = z.object({ label: z.string().trim().min(1).max(40), source: z.string().trim().max(40) });
const ProductInput = z.object({
  name: z.string().trim().min(2, "Give the product a name.").max(80),
  subtitle: z.string().trim().max(120),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(1200),
  priceNaira: z.number({ error: "Enter a price in naira." }).min(100, "Price needs to be at least ₦100.").max(10_000_000).transform((n) => Math.round(n)),
  sizeMl: z.number().int().min(1, "Enter the bottle size in ml.").max(5000),
  status: z.enum(["draft", "active", "archived"]),
  trackInventory: z.boolean(),
  lowStockThreshold: z.number().int().min(0).max(10000),
  benefits: z.array(Benefit).max(4).optional(),
  howToUse: z.array(z.string().trim().min(1).max(240)).max(6).optional(),
});

export async function updateProduct(id: string, input: z.input<typeof ProductInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const d = ProductInput.parse(input);
    if (d.status === "active") {
      const { data: cur } = await supabase.from("products").select("cutout_url").eq("id", id).single();
      if (!cur?.cutout_url) throw new Error("Add a bottle photo (Photo & colour) before putting this product on the shop.");
    }
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
        ...(d.benefits ? { benefits: d.benefits } : {}),
        ...(d.howToUse ? { how_to_use: d.howToUse } : {}),
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

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/* Images: the browser uploads the original straight to storage (no size limit on the way),
   then this tidies it: turns it upright, trims empty transparent edges, resizes and saves a
   light WebP. Bottle photos are checked for a see-through background. */
export async function processUpload(
  rawPath: string,
  kind: "cutout" | "square" | "newsletter",
  name: string,
): Promise<{ ok: true; url: string; transparent: boolean } | { ok: false; error: string }> {
  try {
    await requireStaff();
    if (!/^incoming\/[a-z0-9-]+\.[a-z0-9]+$/i.test(rawPath)) throw new Error("That upload couldn’t be found — please choose the photo again.");
    const sharp = (await import("sharp")).default;
    const db = supabaseAdmin();
    const { data: blob, error: dErr } = await db.storage.from("media").download(rawPath);
    if (dErr || !blob) throw new Error("That upload couldn’t be found — please choose the photo again.");
    const original = Buffer.from(await blob.arrayBuffer());

    const meta = await sharp(original, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height) throw new Error("That file isn’t a photo we can read — try a PNG, WebP or JPG.");

    let transparent = false;
    if (meta.hasAlpha) {
      const stats = await sharp(original, { failOn: "none" }).rotate().stats();
      transparent = (stats.channels[3]?.min ?? 255) < 16;
    }

    let out: Buffer;
    let ext = "webp";
    let type = "image/webp";
    if (kind === "cutout") {
      let upright = await sharp(original, { failOn: "none" }).rotate().toBuffer();
      if (transparent) {
        try {
          upright = await sharp(upright).trim({ threshold: 4 }).toBuffer();
        } catch {}
      }
      out = await sharp(upright).resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 95, effort: 5 }).toBuffer();
    } else if (kind === "square") {
      out = await sharp(original, { failOn: "none" }).rotate().resize({ width: 1600, height: 1600, fit: "cover", withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toBuffer();
    } else {
      // email images: Outlook and older mail apps can't show WebP
      const base = sharp(original, { failOn: "none" }).rotate().resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true });
      if (transparent) {
        out = await base.png({ compressionLevel: 9, palette: false }).toBuffer();
        ext = "png";
        type = "image/png";
      } else {
        out = await base.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        ext = "jpg";
        type = "image/jpeg";
      }
    }

    const folder = kind === "newsletter" ? "newsletter" : "products";
    const dest = `${folder}/${slugify(name) || "image"}-${kind}-${Date.now().toString(36)}.${ext}`;
    const { error: uErr } = await db.storage.from("media").upload(dest, out, { contentType: type, cacheControl: "31536000", upsert: false });
    if (uErr) throw uErr;
    await db.storage.from("media").remove([rawPath]);
    const url = db.storage.from("media").getPublicUrl(dest).data.publicUrl;
    return { ok: true, url, transparent };
  } catch (e) {
    const r = fail(e);
    return r.ok ? { ok: false, error: "Something went wrong — please try again." } : r;
  }
}

const isOurImage = (u: string) => u.startsWith("/images/") || u.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`);
const ImageUrl = z.string().refine(isOurImage, "Please upload the photo again.");

const LookInput = z.object({
  cutoutUrl: ImageUrl.optional(),
  squareUrl: ImageUrl.or(z.literal("")).optional(),
  backdropId: z.string(),
});

/** Bottle photo, lifestyle photo and backdrop — any or all at once. */
export async function saveProductLook(id: string, input: z.input<typeof LookInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const d = LookInput.parse(input);
    const { BACKDROPS } = await import("@/lib/backdrops");
    const b = BACKDROPS.find((x) => x.id === d.backdropId);
    const { error } = await supabase
      .from("products")
      .update({
        ...(b ? { tint_top: b.top, tint_bottom: b.bottom, accent: b.accent } : {}),
        ...(d.cutoutUrl ? { cutout_url: d.cutoutUrl } : {}),
        ...(d.squareUrl !== undefined ? { square_url: d.squareUrl } : {}),
      })
      .eq("id", id);
    if (error) throw error;
    await audit(user.id, "product.look", "product", id, d);
    refreshStore();
    return { ok: true, message: "New look saved — the shop updates within a minute." };
  } catch (e) {
    return fail(e);
  }
}

const NewProductInput = ProductInput.omit({ trackInventory: true, lowStockThreshold: true }).extend({
  cutoutUrl: ImageUrl.optional(),
  squareUrl: ImageUrl.optional(),
  backdropId: z.string(),
});

export async function createProduct(input: z.input<typeof NewProductInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const d = NewProductInput.parse(input);
    if (d.status === "active" && !d.cutoutUrl) throw new Error("Add a bottle photo before putting the product on the shop — or save it hidden for now.");
    const { BACKDROPS } = await import("@/lib/backdrops");
    const b = BACKDROPS.find((x) => x.id === d.backdropId) ?? BACKDROPS[0];

    // a unique web address from the name: "Rosemary Mint" → /products/rosemary-mint
    const base = slugify(d.name) || "oil";
    const [{ data: taken }, { data: last }] = await Promise.all([
      supabase.from("products").select("slug").like("slug", `${base}%`),
      supabase.from("products").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle(),
    ]);
    let slug = base;
    for (let n = 2; taken?.some((t) => t.slug === slug); n++) slug = `${base}-${n}`;

    const { error } = await supabase.from("products").insert({
      slug,
      name: d.name,
      subtitle: d.subtitle,
      tagline: d.tagline || null,
      description: d.description,
      price_kobo: d.priceNaira * 100,
      size_ml: d.sizeMl,
      status: d.status,
      cutout_url: d.cutoutUrl ?? "",
      square_url: d.squareUrl ?? "",
      tint_top: b.top,
      tint_bottom: b.bottom,
      accent: b.accent,
      benefits: d.benefits ?? [],
      how_to_use: d.howToUse ?? [],
      notes: ["Handmade in small batches.", "Cosmetic product — patch-test before first use."],
      sort: (last?.sort ?? 0) + 1,
    });
    if (error) throw error;
    await audit(user.id, "product.create", "product", null, { slug, name: d.name });
    refreshStore();
    revalidatePath("/admin/products");
    return { ok: true, message: d.status === "active" ? `${d.name} is live on the shop.` : `${d.name} saved as hidden — switch it to Active when you’re ready.` };
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
    whatsappNumber: z
      .string()
      .nullable()
      .refine((v) => !v || !v.trim() || isWhatsApp(toWhatsApp(v)), "That doesn’t look like a phone number — try 0803 123 4567.")
      .transform((v) => (v && v.trim() ? toWhatsApp(v) : null)),
    contactEmail: z.string().trim().toLowerCase().email("Enter a valid contact email"),
    instagram: z.string().trim().url("Instagram must be a full link, e.g. https://www.instagram.com/nazia.botanics/").or(z.literal("")),
    tiktok: z.string().trim().url("TikTok must be a full link, e.g. https://www.tiktok.com/@nazia_botanics").or(z.literal("")),
    nudgeEnabled: z.boolean(),
    nudgeDelaySeconds: z.number().int().min(5).max(300),
    orderAlerts: z.boolean(),
    orderAlertEmail: z.string().trim().toLowerCase().email("Enter a full email for order alerts, like name@gmail.com").or(z.literal("")),
  })
  .partial();

export async function saveStorefrontSettings(input: z.input<typeof SettingsInput>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const parsed = SettingsInput.safeParse(input);
    if (!parsed.success) throw parsed.error;
    const d = parsed.data;
    const { data: current } = await supabase.from("site_settings").select("value").eq("key", "storefront").maybeSingle();
    const value: Record<string, unknown> = { ...((current?.value as Record<string, unknown>) ?? {}) };
    if (d.announcements !== undefined) value.announcements = d.announcements;
    if (d.freeDeliveryThresholdNaira !== undefined) value.freeDeliveryThresholdKobo = d.freeDeliveryThresholdNaira ? d.freeDeliveryThresholdNaira * 100 : null;
    if (d.whatsappNumber !== undefined) value.whatsappNumber = d.whatsappNumber || null;
    if (d.contactEmail !== undefined) value.contactEmail = d.contactEmail;
    if (d.instagram !== undefined) value.instagram = d.instagram;
    if (d.tiktok !== undefined) value.tiktok = d.tiktok;
    if (d.nudgeEnabled !== undefined) value.nudgeEnabled = d.nudgeEnabled;
    if (d.nudgeDelaySeconds !== undefined) value.nudgeDelaySeconds = d.nudgeDelaySeconds;
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
export type NewsletterDraft = {
  subject: string;
  preheader?: string;
  body: string;
  tip?: string;
  featuredSlug?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string | null;
  imageCaption?: string;
};

/** Builds the exact email subscribers receive (used by preview, test and send). */
async function buildNewsletter(d: NewsletterDraft) {
  const [{ getProducts, getSettings }, { formatNaira }] = await Promise.all([import("@/lib/data"), import("@/lib/catalog")]);
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  const p = d.featuredSlug ? products.find((x) => x.slug === d.featuredSlug) : null;
  return {
    subject: d.subject.trim(),
    preheader: d.preheader?.trim() || undefined,
    body: d.body,
    tip: d.tip,
    image: d.imageUrl && isOurImage(d.imageUrl) ? { url: d.imageUrl, caption: d.imageCaption?.trim() || undefined } : null,
    featured: p ? { name: p.name, tagline: p.tagline, price: formatNaira(p.priceKobo), slug: p.slug, tint: p.tint } : null,
    cta: d.ctaLabel?.trim() && d.ctaUrl?.trim() ? { label: d.ctaLabel.trim(), url: d.ctaUrl.trim() } : null,
    socials: { instagram: settings.instagram, tiktok: settings.tiktok, whatsapp: settings.whatsappNumber },
  };
}

export async function previewNewsletter(d: NewsletterDraft): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  try {
    await requireStaff();
    const { newsletterEmail } = await import("@/lib/newsletter");
    const input = await buildNewsletter({ ...d, subject: d.subject || "Your subject line", body: d.body || "Start writing — your words appear here as subscribers will see them." });
    return { ok: true, html: newsletterEmail(input, "#") };
  } catch (e) {
    const r = fail(e);
    return { ok: false, error: r.ok ? "" : r.error };
  }
}

const TestTo = z.array(z.string().trim().toLowerCase().email("One of the test addresses isn’t a full email.")).min(1, "Add at least one email to test with.").max(10, "Tests go to 10 people at most.");

/** `to: "everyone"` sends to all subscribers (owner only); a list of emails sends a [Test] copy just to them. */
export async function sendNewsletter(d: NewsletterDraft, to: "everyone" | string[]): Promise<Result> {
  try {
    const { user } = to === "everyone" ? await requireOwner() : await requireStaff();
    if (d.subject.trim().length < 3 || d.body.trim().length < 20) throw new Error("Add a subject and a few lines of copy.");
    const { newsletterEmail, unsubscribeUrl, plainSubject } = await import("@/lib/newsletter");
    const { sendEmailBatch } = await import("@/lib/email");
    const input = await buildNewsletter(d);
    // one-click unsubscribe headers: required by Gmail and Yahoo for bulk senders
    const mail = (email: string, subject: string) => {
      const unsub = unsubscribeUrl(email);
      return { to: email, subject, html: newsletterEmail(input, unsub), headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
    };

    if (to !== "everyone") {
      const list = [...new Set(TestTo.parse(to))];
      const sent = await sendEmailBatch(list.map((e) => mail(e, `[Test] ${plainSubject(input.subject)}`)), "newsletter_test");
      if (!sent) throw new Error("The test didn’t send — check the email settings and try again.");
      return { ok: true, message: list.length === 1 ? `Test sent to ${list[0]}` : `Test sent to ${list.length} people` };
    }

    const { data: subs, error } = await supabaseAdmin().from("newsletter_subscribers").select("email").eq("status", "subscribed");
    if (error) throw error;
    const sent = await sendEmailBatch((subs ?? []).map((s) => mail(s.email, plainSubject(input.subject))), "newsletter");
    await audit(user.id, "newsletter.send", "newsletter", null, { subject: plainSubject(input.subject), recipients: subs?.length ?? 0, sent });
    return { ok: true, message: `Sent to ${sent} of ${subs?.length ?? 0} subscribers.` };
  } catch (e) {
    return fail(e);
  }
}

// ─── Site words ──────────────────────────────────────────────────────────────
/** Saves edited website text. Empty or unchanged-from-original values fall back to the original. */
export async function saveSiteWords(changes: Record<string, string>): Promise<Result> {
  try {
    const { supabase, user } = await requireStaff();
    const { FIELD_BY_KEY } = await import("@/lib/content");
    const { data: current } = await supabase.from("site_settings").select("value").eq("key", "content").maybeSingle();
    const value: Record<string, string> = { ...((current?.value as Record<string, string>) ?? {}) };
    let n = 0;
    for (const [key, raw] of Object.entries(changes)) {
      const field = FIELD_BY_KEY.get(key);
      if (!field) continue;
      const text = String(raw ?? "").replace(/\r\n/g, "\n").trim();
      if (text.length > (field.max ?? 1000)) throw new Error(`“${field.label}” is too long (max ${field.max} characters).`);
      if (!text || text === field.default) delete value[key];
      else value[key] = text;
      n++;
    }
    const { error } = await supabase.from("site_settings").upsert({ key: "content", value, is_public: true });
    if (error) throw error;
    await audit(user.id, "content.save", "site_settings", "content", { keys: Object.keys(changes) });
    revalidatePath("/", "layout");
    return { ok: true, message: `${n} change${n === 1 ? "" : "s"} saved — live on the site within a minute.` };
  } catch (e) {
    return fail(e);
  }
}

// ─── Practice data ───────────────────────────────────────────────────────────
export async function clearPracticeData(): Promise<Result> {
  try {
    const { user } = await requireOwner();
    const { clearDemo } = await import("@/lib/demo");
    const r = await clearDemo();
    await audit(user.id, "demo.clear", "demo", null, r);
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Practice data removed — ${r.orders} orders, ${r.customers} customers and ${r.riders} riders.` };
  } catch (e) {
    return fail(e);
  }
}
