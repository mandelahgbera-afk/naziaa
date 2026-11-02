import { z } from "zod";
import { clientIp, limit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Receives anonymous visit statistics from src/lib/insights.ts. The IP address is used for the rate
   limit only and never stored; the country and city come from the hosting network's own headers. */
const Value = z.union([z.string().max(80), z.number().finite()]);
const Body = z.object({
  s: z.string().uuid(),
  p: z.string().max(120).regex(/^\//),
  scroll: z.number().int().min(0).max(100).optional(),
  source: z.string().max(60).optional(),
  device: z.enum(["phone", "tablet", "computer"]).optional(),
  ev: z
    .array(
      z.object({
        k: z.enum(["page_view", "page_leave", "rage_click", "form_abandon", "js_error", "vital", "product_view", "add_to_bag", "checkout_start", "paid", "subscribe"]),
        p: z.string().max(120).regex(/^\//),
        d: z.record(z.string().max(12), Value).optional(),
      }),
    )
    .max(30),
});

const BOT = /bot|crawl|spider|preview|headless|lighthouse|facebookexternalhit|whatsapp/i;
const done = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return done();
  const { ok } = await limit("insights", clientIp(req), 120);
  if (!ok) return done();
  const parsed = Body.safeParse(JSON.parse((await req.text().catch(() => "")) || "null"));
  if (!parsed.success) return done();
  const b = parsed.data;
  const city = req.headers.get("x-vercel-ip-city");
  try {
    const db = supabaseAdmin();
    await db.from("site_sessions").upsert(
      {
        id: b.s,
        last_seen: new Date().toISOString(),
        path: b.p,
        scroll: b.scroll ?? 0,
        country: req.headers.get("x-vercel-ip-country"),
        city: city ? decodeURIComponent(city).slice(0, 60) : null,
        ...(b.source ? { source: b.source } : {}),
        ...(b.device ? { device: b.device } : {}),
      },
      { onConflict: "id" },
    );
    if (b.ev.length) await db.from("site_events").insert(b.ev.map((e) => ({ session_id: b.s, kind: e.k, path: e.p, data: e.d ?? null })));
  } catch (e) {
    console.error("insights save failed", e);
  }
  return done();
}
