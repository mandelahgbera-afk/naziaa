import { NewsletterComposer } from "@/components/admin/newsletter-composer";
import { Card, PageHead, Stat } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { getProducts } from "@/lib/data";

export default async function NewsletterPage() {
  const { supabase, profile } = await requireStaff();
  const products = await getProducts();
  const [{ count: subscribed }, { count: unsub }, { data: recent }, { data: sends }] = await Promise.all([
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
    supabase.from("newsletter_subscribers").select("email, source, created_at").eq("status", "subscribed").order("created_at", { ascending: false }).limit(8),
    supabase.from("audit_log").select("detail, created_at").eq("action", "newsletter.send").order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <>
      <PageHead eyebrow="Marketing" title="Newsletter" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Subscribed" value={subscribed ?? 0} />
        <Stat label="Unsubscribed" value={unsub ?? 0} />
        <Stat label="Campaigns sent" value={sends?.length ?? 0} hint="most recent five shown below" />
      </div>
      <Card className="mt-4">
        <NewsletterComposer canSend={profile.role === "owner"} products={products.map((p) => ({ slug: p.slug, name: p.name }))} subscribers={subscribed ?? 0} />
      </Card>
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
