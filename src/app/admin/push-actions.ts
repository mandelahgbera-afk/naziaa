"use server";

import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/catalog";
import { pushReady, pushToStaff } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

/* Phone notifications for the Studio: each staff member turns them on per phone and picks what to hear about.
   Rows are their own (row-level security); saving uses the server key only so a phone that someone else
   used before is handed over to whoever is signed in now. */

type Result = { ok: true; message?: string } | { ok: false; error: string };

const KINDS = z.array(z.enum(["order", "complaint", "delivery", "stock"])).min(1).max(4);
const Sub = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscription(sub: unknown, kinds: string[], device: string): Promise<Result> {
  const { user } = await requireStaff();
  const s = Sub.safeParse(sub);
  const k = KINDS.safeParse(kinds);
  if (!s.success || !k.success) return { ok: false, error: "This phone sent something unexpected. Try turning it on again." };
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      { endpoint: s.data.endpoint, user_id: user.id, p256dh: s.data.keys.p256dh, auth: s.data.keys.auth, kinds: k.data, device: device.slice(0, 80) },
      { onConflict: "endpoint" },
    );
  if (error) {
    console.error("save push subscription failed", error);
    return { ok: false, error: /relation|does not exist/i.test(error.message) ? "Notifications need one database step first (see the setup note)." : "Couldn’t save this phone. Try again." };
  }
  return { ok: true };
}

export async function updatePushKinds(endpoint: string, kinds: string[]): Promise<Result> {
  const { supabase } = await requireStaff();
  const k = KINDS.safeParse(kinds);
  if (!k.success) return { ok: false, error: "Keep at least one on, or turn notifications off." };
  const { error } = await supabase.from("push_subscriptions").update({ kinds: k.data }).eq("endpoint", endpoint);
  return error ? { ok: false, error: "Couldn’t save that. Try again." } : { ok: true, message: "Saved." };
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  const { supabase } = await requireStaff();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

/** The kinds this phone chose, if it's still on file. */
export async function pushKindsFor(endpoint: string): Promise<string[] | null> {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("push_subscriptions").select("kinds").eq("endpoint", endpoint).maybeSingle();
  return (data?.kinds as string[] | undefined) ?? null;
}

export async function sendTestPush(endpoint: string): Promise<Result> {
  const { supabase } = await requireStaff();
  if (!pushReady()) return { ok: false, error: "Notifications aren’t switched on for the shop yet." };
  const { data } = await supabase.from("push_subscriptions").select("endpoint").eq("endpoint", endpoint).maybeSingle();
  if (!data) return { ok: false, error: "This phone isn’t on the list any more. Turn notifications on again." };
  const r = await pushToStaff("test", { title: "Nazia Studio", body: "This is how a new order will reach you.", url: "", tag: "test" }, endpoint);
  return r.sent ? { ok: true, message: "Sent. It should arrive in a few seconds." } : { ok: false, error: "It didn’t go through. Turn notifications off and on again." };
}

/** What the Studio checks every 30 s while it's on screen: the newest order that has been paid, and open care cases. */
export async function studioPulse(): Promise<{ order: { id: string; ref: string; title: string; body: string } | null; care: number } | null> {
  // a background check: when the sign-in has lapsed it stays quiet instead of jumping to the login page
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "staff" && profile?.role !== "owner") return null;
  const [{ data: o }, { count }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, ref, total_kobo, full_name")
      .not("status", "in", "(pending_payment,cancelled)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("complaints").select("id", { count: "exact", head: true }).neq("status", "resolved"),
  ]);
  const first = (o?.full_name ?? "").trim().split(/\s+/)[0] || "a customer";
  return {
    order: o ? { id: o.id, ref: o.ref, title: `New order · ${o.ref}`, body: `${formatNaira(o.total_kobo)} · for ${first}` } : null,
    care: count ?? 0,
  };
}
