import { sendEmail } from "./email";
import { rejoinUrl } from "./newsletter";
import { supabaseAdmin } from "./supabase/admin";

/* The one way into the list from public forms. Typing someone's email can never undo their
   unsubscribe: they get a link to confirm it themselves. The answer looks the same either way,
   so the form can't be used to find out who is on the list. */
export async function subscribe(email: string, source: string) {
  const db = supabaseAdmin();
  const { data: cur, error } = await db.from("newsletter_subscribers").select("status").eq("email", email).maybeSingle();
  if (error) throw error;
  if (!cur) {
    const { error: e } = await db
      .from("newsletter_subscribers")
      .upsert({ email, source, status: "subscribed", consent_at: new Date().toISOString() }, { onConflict: "email", ignoreDuplicates: true });
    if (e) throw e;
    return;
  }
  if (cur.status === "subscribed") {
    // choosing something on the waiting list moves them to that list
    if (source.startsWith("waitlist")) await db.from("newsletter_subscribers").update({ source }).eq("email", email);
    return;
  }
  const url = rejoinUrl(email, source);
  await sendEmail({
    to: email,
    subject: "Join Nazia’s emails again?",
    tag: "rejoin",
    html: `<div style="font-family:Georgia,serif;color:#2b211c;text-align:center;padding:32px"><p style="letter-spacing:.3em">NAZIA</p><p>You asked to rejoin our emails. Tap below to confirm. If this wasn’t you, ignore this message and nothing changes.</p><p><a href="${url.replace(/&/g, "&amp;")}" style="color:#9a4d16">Yes, sign me back up</a></p></div>`,
  });
}
