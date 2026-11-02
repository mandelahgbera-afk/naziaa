import { emailPage } from "@/lib/email-page";
import { signatureOk } from "@/lib/newsletter";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Someone who once unsubscribed can only come back from their own inbox. */
const check = (req: Request) => {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const source = (url.searchParams.get("src") ?? "site").slice(0, 80);
  return { email, source, search: url.search, ok: !!email && signatureOk(`rejoin:${email}:${source}`, url.searchParams.get("s") ?? "") };
};

export async function GET(req: Request) {
  const { ok, search } = check(req);
  if (!ok) return emailPage("That link isn’t valid.");
  return emailPage("Join our emails again?", { action: `/api/newsletter/rejoin${search}`, label: "Yes, sign me back up" });
}

export async function POST(req: Request) {
  const { ok, email, source } = check(req);
  if (!ok) return emailPage("That link isn’t valid.");
  await supabaseAdmin()
    .from("newsletter_subscribers")
    .update({ status: "subscribed", source, consent_at: new Date().toISOString(), unsubscribed_at: null })
    .eq("email", email);
  return emailPage("Welcome back.");
}
