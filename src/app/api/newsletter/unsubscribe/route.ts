import { signEmail } from "@/lib/newsletter";
import { supabaseAdmin } from "@/lib/supabase/admin";

const page = (msg: string) =>
  new Response(
    `<!doctype html><meta name="viewport" content="width=device-width"><title>Nazia Botanics</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#faf3ec;font-family:Georgia,serif;color:#2b211c;text-align:center;padding:24px"><div><p style="letter-spacing:.34em">NAZIA</p><h1 style="font-weight:400">${msg}</h1><a href="/" style="color:#9a4d16">Back to the shop</a></div></body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").toLowerCase();
  const sig = url.searchParams.get("s") ?? "";
  if (!email || sig !== signEmail(email)) return page("That link isn’t valid.");
  await supabaseAdmin().from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("email", email);
  return page("You’ve been unsubscribed. We’ll miss you.");
}

// One-click unsubscribe (RFC 8058) from mail clients
export const POST = GET;
