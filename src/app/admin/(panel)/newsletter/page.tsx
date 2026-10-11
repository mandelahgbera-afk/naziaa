import { NewsletterComposer } from "@/components/admin/newsletter-composer";
import { FindSubscriber, ImportList, SubscriberLists } from "@/components/admin/newsletter-lists";
import { Card, PageHead, Stat } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { getProducts } from "@/lib/data";

/** everyone on the list — read 1,000 at a time (the database's per-request cap) */
async function allSubscribers(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"]) {
  const rows: { email: string; source: string | null; status: string }[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase.from("newsletter_subscribers").select("email, source, status").order("created_at", { ascending: false }).range(from, from + 999);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export default async function NewsletterPage() {
  const { supabase, profile, user } = await requireStaff();
  const products = await getProducts();
  const [{ count: subscribed }, { count: unsub }, { data: recent }, { data: sends }, { data: people }, everyone] = await Promise.all([
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
    supabase.from("newsletter_subscribers").select("email, source, created_at").eq("status", "subscribed").order("created_at", { ascending: false }).limit(8),
    supabase.from("audit_log").select("detail, created_at").eq("action", "newsletter.send").order("created_at", { ascending: false }).limit(5),
    supabase.from("newsletter_subscribers").select("email").eq("status", "subscribed").order("created_at", { ascending: false }).limit(300),
    allSubscribers(supabase),
  ]);
  // group everyone by where they came from — each group is a "list"
  const lists = Object.values(
    everyone.reduce<Record<string, { source: string; subscribed: number; total: number }>>((acc, r) => {
      const k = r.source ?? "";
      acc[k] ??= { source: k, subscribed: 0, total: 0 };
      acc[k].total++;
      if (r.status === "subscribed") acc[k].subscribed++;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHead eyebrow="Marketing" title="Newsletter" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Subscribed" value={subscribed ?? 0} />
        <Stat label="Unsubscribed" value={unsub ?? 0} />
        <Stat label="Campaigns sent" value={sends?.length ?? 0} hint="most recent five shown below" />
      </div>
      <Card className="mt-4">
        <NewsletterComposer canSend={profile.role === "owner"} products={products.map((p) => ({ slug: p.slug, name: p.name }))} subscribers={subscribed ?? 0} myEmail={user.email ?? ""} people={(people ?? []).map((p) => p.email)} />
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="eyebrow mb-1">Import a list</p>
          <p className="mb-4 text-sm text-muted">Bring in emails from a spreadsheet, a sign-up sheet or your phone’s contacts.</p>
          <ImportList />
        </Card>
        <div className="space-y-4">
          <Card>
            <p className="eyebrow mb-1">Your lists</p>
            <SubscriberLists lists={lists} canDelete={profile.role === "owner"} />
          </Card>
          <Card>
            <p className="eyebrow mb-3">Find someone</p>
            <FindSubscriber people={everyone.map((r) => ({ email: r.email, source: r.source }))} />
          </Card>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <p className="eyebrow mb-3">Newest subscribers</p>
            <ul className="space-y-2 text-sm">
              {(recent ?? []).map((r) => (
                <li key={r.email} className="flex justify-between gap-3"><span className="truncate">{r.email}</span><span className="text-xs text-muted">{r.source}</span></li>
              ))}
              {!recent?.length && <li className="text-muted">No subscribers yet.</li>}
            </ul>
          </Card>
          <Card>
            <p className="eyebrow mb-3">Sent</p>
            <ul className="space-y-2 text-sm">
              {(sends ?? []).map((s, i) => {
                const d = s.detail as { subject?: string; sent?: number };
                return <li key={i}>{d.subject} <span className="text-xs text-muted">· {d.sent} · {new Date(s.created_at).toLocaleDateString("en-NG")}</span></li>;
              })}
              {!sends?.length && <li className="text-muted">Nothing sent yet.</li>}
            </ul>
          </Card>
      </div>
    </>
  );
}
