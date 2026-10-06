import { z } from "zod";
import { clientIp, limit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Saves the bag against an email as soon as the shopper types it, so an
   unfinished checkout can be followed up and restored on any device. */

const Body = z.object({
  id: z.string().uuid().nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(24).optional(),
  lines: z.array(z.object({ slug: z.string(), name: z.string().max(120), qty: z.number().int().min(1).max(10), priceKobo: z.number().int().min(0) })).max(20),
});

export async function POST(req: Request) {
  const { ok } = await limit("checkout-session", clientIp(req), 20);
  if (!ok) return Response.json({ error: "slow down" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { id, email, fullName, phone, lines } = parsed.data;
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
    const q = id
      ? db.from("checkout_sessions").update(row).eq("id", id).eq("status", "open").select("id").maybeSingle()
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
