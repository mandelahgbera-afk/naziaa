import { z } from "zod";
import { getProducts } from "@/lib/data";
import { clientIp, limit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Saves the bag against an email as soon as the shopper types it, so an
   unfinished checkout can be followed up and restored on any device. */

const Body = z.object({
  id: z.string().uuid().nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  // goes into reminder emails, so letters only: no links or messages can be planted
  fullName: z.string().trim().max(60).regex(/^[\p{L}\p{M} '’-]*$/u).optional().catch(undefined),
  phone: z.string().trim().max(24).optional(),
  lines: z.array(z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(80), qty: z.number().int().min(1).max(10) })).max(20),
});

/* "Don't email me about this bag": the contact details come off the open bag
   (this one, and any other open bag under the same email), so no reminder can go. */
const Forget = z.object({
  forget: z.literal(true),
  id: z.string().uuid().nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional().catch(undefined),
});

async function forget({ id, email }: z.infer<typeof Forget>) {
  const db = supabaseAdmin();
  const wipe = { email: null, full_name: null, phone: null };
  if (id) {
    const { error } = await db.from("checkout_sessions").update(wipe).eq("id", id).eq("status", "open");
    if (error) throw error;
  }
  if (email) {
    const { error } = await db.from("checkout_sessions").update(wipe).eq("email", email).eq("status", "open");
    if (error) throw error;
  }
}

export async function POST(req: Request) {
  const { ok } = await limit("checkout-session", clientIp(req), 20);
  if (!ok) return Response.json({ error: "slow down" }, { status: 429 });
  const body = await req.json().catch(() => null);
  const f = Forget.safeParse(body);
  if (f.success) {
    try {
      await forget(f.data);
      return Response.json({ id: null });
    } catch (e) {
      console.error("checkout session forget failed", e);
      return Response.json({ error: "retry" }, { status: 500 });
    }
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { id, email, fullName, phone } = parsed.data;
  // names and prices come from the catalogue, never from the browser
  const products = await getProducts();
  const lines = parsed.data.lines.flatMap((l) => {
    const p = products.find((x) => x.slug === l.slug);
    return p ? [{ slug: p.slug, name: p.name, qty: l.qty, priceKobo: p.priceKobo }] : [];
  });
  const row = {
    email,
    full_name: fullName || null,
    phone: phone || null,
    lines,
    subtotal_kobo: lines.reduce((n, l) => n + l.qty * l.priceKobo, 0),
    status: "open",
  };
  try {
    const db = supabaseAdmin();
    // one open bag per email, so reminders can't be multiplied against someone's inbox
    const { data: same } = id ? { data: null } : await db.from("checkout_sessions").select("id").eq("email", email).eq("status", "open").limit(1).maybeSingle();
    const target = id ?? same?.id;
    const q = target
      ? db.from("checkout_sessions").update(row).eq("id", target).eq("status", "open").select("id").maybeSingle()
      : db.from("checkout_sessions").insert(row).select("id").single();
    const { data, error } = await q;
    if (error) throw error;
    if (!data) {
      const { data: fresh, error: e2 } = await db.from("checkout_sessions").insert(row).select("id").single();
      if (e2) throw e2;
      return Response.json({ id: fresh.id });
    }
    return Response.json({ id: data.id });
  } catch (e) {
    console.error("checkout session save failed", e);
    return Response.json({ id: null }, { status: 202 });
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return Response.json({ lines: [] });
  try {
    const { data } = await supabaseAdmin().from("checkout_sessions").select("lines, status").eq("id", id).maybeSingle();
    return Response.json({ lines: data?.status === "open" ? data.lines : [] });
  } catch {
    return Response.json({ lines: [] });
  }
}
