import { cronAuthorized } from "@/lib/cron";
import { cartReminderEmail, sendEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Abandoned-bag sequence: three gentle reminders. The schedule is the gap in
   hours since the previous touch (checkout activity or the last reminder):
   [1, 24, 48] → about 1h, 25h and 73h after they left. Stops the moment they pay;
   expires after 7 days. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("unauthorised", { status: 401 });
  const db = supabaseAdmin();

  const { data: ops } = await db.from("site_settings").select("value").eq("key", "operations").maybeSingle();
  const cfg = (ops?.value as { cartReminders?: { enabled?: boolean; afterHours?: number[] } } | null)?.cartReminders;
  if (cfg?.enabled === false) return Response.json({ skipped: "disabled" });
  const schedule = cfg?.afterHours?.length ? cfg.afterHours : [1, 24, 48];

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  await db.from("checkout_sessions").update({ status: "expired" }).eq("status", "open").lt("updated_at", weekAgo);

  const { data: sessions } = await db
    .from("checkout_sessions")
    .select("id, email, full_name, lines, reminders_sent, updated_at, created_at, order_id")
    .eq("status", "open")
    .not("email", "is", null)
    .lt("reminders_sent", schedule.length)
    .limit(200);

  let sent = 0;
  for (const s of sessions ?? []) {
    const due = new Date(s.updated_at).getTime() + schedule[s.reminders_sent] * 3600_000;
    if (Date.now() < due) continue;

    // they may have bought since (on another device, or straight from the bag)
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("email", s.email)
      .not("status", "in", "(pending_payment,cancelled)")
      .gte("created_at", s.created_at);
    if (count) {
      await db.from("checkout_sessions").update({ status: "converted" }).eq("id", s.id);
      continue;
    }

    const lines = (s.lines as { name: string; qty: number }[]) ?? [];
    if (!lines.length) continue;
    const mail = cartReminderEmail({ name: s.full_name, lines, step: s.reminders_sent, sessionId: s.id });
    const r = await sendEmail({ to: s.email!, subject: mail.subject, html: mail.html, tag: `cart_reminder_${s.reminders_sent + 1}` });
    if (!r.skipped) {
      // the touch trigger moves updated_at to now, which anchors the next gap
      await db.from("checkout_sessions").update({ reminders_sent: s.reminders_sent + 1, last_reminder_at: new Date().toISOString() }).eq("id", s.id);
      sent++;
    }
  }
  return Response.json({ sent });
}
