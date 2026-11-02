import { emailPage } from "@/lib/email-page";
import { signatureOk } from "@/lib/newsletter";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Opening the link only asks (mail scanners open every link, and must not unsubscribe anyone);
   the button, or a mail app's one-click (RFC 8058), is a POST and does it. */
const check = (req: Request) => {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  return { email, ok: !!email && signatureOk(email, url.searchParams.get("s") ?? ""), search: url.search };
};

export async function GET(req: Request) {
  const { ok, search } = check(req);
  if (!ok) return emailPage("That link isn’t valid.");
  return emailPage("Leave our emails?", { action: `/api/newsletter/unsubscribe${search}`, label: "Yes, unsubscribe me" });
}

export async function POST(req: Request) {
  const { ok, email } = check(req);
  if (!ok) return emailPage("That link isn’t valid.");
  // saved even for someone not on the list, so bag reminders stop for them too
  await supabaseAdmin()
    .from("newsletter_subscribers")
    .upsert({ email, status: "unsubscribed", unsubscribed_at: new Date().toISOString() }, { onConflict: "email" });
  return emailPage("You’ve been unsubscribed. We’ll miss you.");
}
