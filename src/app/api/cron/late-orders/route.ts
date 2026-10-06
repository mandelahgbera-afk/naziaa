import { cronAuthorized } from "@/lib/cron";
import { sendLateApology } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Flags every active order that has passed its promised time, logs it on the
   timeline (so it lights up on the board) and sends one personal apology. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("unauthorised", { status: 401 });
  const db = supabaseAdmin();
  const { data: late, error } = await db
    .from("orders")
    .select("id, ref")
    .in("status", ["paid", "packed", "assigned", "out_for_delivery"])
    .lt("promised_by", new Date().toISOString())
    .is("late_flagged_at", null)
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: ops } = await db.from("site_settings").select("value").eq("key", "operations").maybeSingle();
  const apologise = (ops?.value as { lateApologyVoucher?: { enabled?: boolean } } | null)?.lateApologyVoucher?.enabled !== false;

  for (const o of late ?? []) {
    await db.from("orders").update({ late_flagged_at: new Date().toISOString() }).eq("id", o.id);
    await db.from("order_events").insert({ order_id: o.id, kind: "late", message: "Passed its promised delivery time" });
    // Vouchers arrive with the discount-code system; until then the apology is personal, with no code
    if (apologise) await sendLateApology(o.id, null);
  }
  return Response.json({ flagged: late?.length ?? 0 });
}
