import { z } from "zod";
import { clientIp, limit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Waiting-list sign-ups join the newsletter list tagged with what they asked for:
   "waitlist" (everything), "waitlist · next-oil" or "waitlist · <product-slug>".
   Each shows up as its own list in Studio → Newsletter, ready to email or remove. */
const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  interest: z.string().regex(/^(all|next-oil|[a-z0-9-]{2,60})$/),
  consent: z.literal(true),
});

export async function POST(req: Request) {
  const { ok } = await limit("waitlist", clientIp(req), 6);
  if (!ok) return Response.json({ error: "Too many tries — please wait a minute." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  const { email, interest } = parsed.data;
  const source = interest === "all" ? "waitlist" : `waitlist · ${interest}`;

  try {
    const db = supabaseAdmin();
    const { error } = await db
      .from("newsletter_subscribers")
      .upsert({ email, source, status: "subscribed", consent_at: new Date().toISOString(), unsubscribed_at: null }, { onConflict: "email" });
    if (error) throw error;
    const { count } = await db.from("newsletter_subscribers").select("id", { count: "exact", head: true }).like("source", "waitlist%").eq("status", "subscribed");
    return Response.json({ ok: true, position: count ?? null });
  } catch (e) {
    console.error("waitlist signup failed", e);
    return Response.json({ error: "We couldn’t add you just now — please try again in a moment." }, { status: 503 });
  }
}
