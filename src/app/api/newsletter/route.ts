import { z } from "zod";
import { clientIp, limit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consent: z.literal(true),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const { ok } = await limit("newsletter", clientIp(req), 5);
  if (!ok) return Response.json({ error: "Too many attempts — try again in a minute." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please enter a valid email and tick the consent box." }, { status: 400 });

  try {
    const { error } = await supabaseAdmin()
      .from("newsletter_subscribers")
      .upsert(
        { email: parsed.data.email, source: parsed.data.source ?? "site", status: "subscribed", consent_at: new Date().toISOString() },
        { onConflict: "email" },
      );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("newsletter signup failed", e);
    return Response.json({ error: "Sign-ups are opening shortly — please try again soon." }, { status: 503 });
  }
}
