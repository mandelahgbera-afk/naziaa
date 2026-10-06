import { z } from "zod";
import { clientIp, limit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTrackedOrder } from "@/lib/tracking";

/* GET  → live status + rider position (only while out for delivery)
   POST → { kind: "rating", rating, feedback } | { kind: "complaint", category, body } */

export async function GET(req: Request, ctx: RouteContext<"/api/orders/[ref]">) {
  const { ref } = await ctx.params;
  const order = await getTrackedOrder(ref, new URL(req.url).searchParams.get("t"));
  if (!order) return Response.json({ error: "not found" }, { status: 404 });

  let rider: { lat: number; lng: number; updated_at: string } | null = null;
  if (order.status === "out_for_delivery" && order.rider_id) {
    const { data } = await supabaseAdmin().from("rider_locations").select("lat, lng, updated_at").eq("rider_id", order.rider_id).maybeSingle();
    rider = data;
  }
  return Response.json({ status: order.status, rider }, { headers: { "cache-control": "no-store" } });
}

const Post = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("rating"), rating: z.number().int().min(1).max(5), feedback: z.string().trim().max(1000).optional() }),
  z.object({
    kind: z.literal("complaint"),
    category: z.enum(["late", "damaged", "wrong_item", "skin_reaction", "missing", "other"]),
    body: z.string().trim().min(5).max(2000),
  }),
]);

export async function POST(req: Request, ctx: RouteContext<"/api/orders/[ref]">) {
  const { ok } = await limit("order-feedback", clientIp(req), 6);
  if (!ok) return Response.json({ error: "Please wait a minute." }, { status: 429 });
  const { ref } = await ctx.params;
  const order = await getTrackedOrder(ref, new URL(req.url).searchParams.get("t"));
  if (!order) return Response.json({ error: "not found" }, { status: 404 });

  const parsed = Post.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please check your message." }, { status: 400 });
  const db = supabaseAdmin();

  if (parsed.data.kind === "rating") {
    if (order.status !== "delivered") return Response.json({ error: "You can rate once your order arrives." }, { status: 409 });
    await db.from("orders").update({ delivery_rating: parsed.data.rating, delivery_feedback: parsed.data.feedback ?? null }).eq("id", order.id);
    return Response.json({ ok: true });
  }

  const { data: full } = await db.from("orders").select("customer_id, rider_id").eq("id", order.id).single();
  const { error } = await db.from("complaints").insert({
    order_id: order.id,
    customer_id: full?.customer_id ?? null,
    rider_id: full?.rider_id ?? null,
    category: parsed.data.category,
    body: parsed.data.body,
  });
  if (error) return Response.json({ error: "We couldn’t send that — please email us." }, { status: 500 });
  await db.from("order_events").insert({ order_id: order.id, kind: "complaint", message: `Customer raised: ${parsed.data.category}` });
  return Response.json({ ok: true });
}
