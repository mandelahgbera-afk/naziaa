import Link from "next/link";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { Card, PageHead, Stat } from "@/components/admin/ui";
import { adminHref } from "@/lib/admin-path";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/catalog";
import { waLink } from "@/lib/social";
import { daysAgoIso, nowMs } from "@/lib/time";

type Session = { id: string; first_seen: string; last_seen: string; path: string | null; scroll: number | null; device: string | null; country: string | null; city: string | null; source: string | null };
type Event = { session_id: string; kind: string; path: string | null; data: Record<string, string | number> | null };

const RANGES = [{ d: 1, label: "Today" }, { d: 7, label: "7 days" }, { d: 30, label: "30 days" }];
const PAGE_NAMES: Record<string, string> = { "/": "Homepage", "/shop": "Shop", "/checkout": "Checkout", "/checkout/complete": "Order confirmed", "/ritual": "Guided ritual", "/waitlist": "Waiting list", "/ingredients": "Ingredients", "/our-story": "Our story", "/journal": "Journal", "/track": "Track an order", "/orders/[order]": "Order tracking" };
const FIELD_NAMES: Record<string, string> = { email: "Email", phone: "Phone", fullName: "Name", name: "Name", line1: "House & street", area: "Area", city: "City", state: "State", landmark: "Landmark", marketing: "Newsletter tick box" };
const pageName = (p: string | null) => {
  if (!p) return "Unknown";
  if (PAGE_NAMES[p]) return PAGE_NAMES[p];
  return p.split("/").filter(Boolean).pop()?.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ") ?? p;
};
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const ago = (iso: string, now: number) => {
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
const tally = <T,>(rows: T[], key: (r: T) => string | null | undefined) => {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

async function paged<T>(run: (from: number, to: number) => PromiseLike<{ data: unknown; error: { code?: string } | null }>, cap: number) {
  const rows: T[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await run(from, from + 999);
    if (error) return { rows, error };
    const got = (data ?? []) as T[];
    rows.push(...got);
    if (got.length < 1000) break;
  }
  return { rows, error: null };
}

function Bars({ rows, total, empty, name = (s: string) => s }: { rows: [string, number][]; total: number; empty: string; name?: (s: string) => string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.slice(0, 8).map(([k, n]) => (
        <li key={k}>
          <div className="flex justify-between gap-3 text-sm"><span className="truncate">{name(k)}</span><span className="shrink-0 text-muted tabular-nums">{n.toLocaleString("en-NG")}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-deep"><div className="h-full rounded-full bg-amber" style={{ width: `${Math.max(3, pct(n, total))}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function InsightsPage({ searchParams }: PageProps<"/admin/insights">) {
  const { supabase } = await requireStaff();
  const wanted = (await searchParams).d;
  const days = RANGES.find((r) => String(r.d) === wanted)?.d ?? 7;
  const since = daysAgoIso(days);
  const now = nowMs();

  const [sess, evs, live, carts] = await Promise.all([
    paged<Session>((a, b) => supabase.from("site_sessions").select("*").gte("last_seen", since).order("last_seen", { ascending: false }).range(a, b), 20000),
    paged<Event>((a, b) => supabase.from("site_events").select("session_id, kind, path, data").gte("created_at", since).order("created_at", { ascending: false }).range(a, b), 40000),
    supabase.from("site_sessions").select("*").gte("last_seen", new Date(now - 60_000).toISOString()).order("last_seen", { ascending: false }).limit(30),
    supabase.from("checkout_sessions").select("id, email, full_name, phone, lines, subtotal_kobo, status, reminders_sent, updated_at").gte("updated_at", since).not("email", "like", "%.invalid").order("updated_at", { ascending: false }).limit(200),
  ]);

  if (sess.error) {
    return (
      <>
        <PageHead eyebrow="Studio" title="Insights" />
        <Card>
          <p className="font-serif text-2xl">One setup step left.</p>
          <p className="mt-2 text-sm text-ink-soft">Run <code>supabase/migrations/20261101000000_insights.sql</code> in the Supabase SQL editor, and visits start appearing here.</p>
        </Card>
      </>
    );
  }

  const sessions = sess.rows;
  const events = evs.rows;
  const visits = sessions.length;
  const reached = (kind: string, path?: string) => new Set(events.filter((e) => e.kind === kind && (!path || e.path === path)).map((e) => e.session_id)).size;
  const funnel = [
    { label: "Visited", n: visits },
    { label: "Looked at an oil", n: reached("product_view") },
    { label: "Added to bag", n: reached("add_to_bag") },
    { label: "Reached checkout", n: reached("page_view", "/checkout") },
    { label: "Tapped pay", n: reached("checkout_start") },
    { label: "Paid", n: reached("paid") },
  ];

  const leaves = events.filter((e) => e.kind === "page_leave");
  const pages = tally(events.filter((e) => e.kind === "page_view"), (e) => e.path).slice(0, 10).map(([path, views]) => {
    const here = leaves.filter((l) => l.path === path);
    const avg = (key: string) => (here.length ? Math.round(here.reduce((n, l) => n + Number(l.data?.[key] ?? 0), 0) / here.length) : 0);
    return { path, views, sec: avg("sec"), scroll: avg("scroll") };
  });
  const rage = tally(events.filter((e) => e.kind === "rage_click"), (e) => `${pageName(e.path)} → ${e.data?.on ?? "?"}`);
  const abandon = tally(events.filter((e) => e.kind === "form_abandon"), (e) => String(e.data?.field ?? ""));
  const errors = tally(events.filter((e) => e.kind === "js_error"), (e) => `${pageName(e.path)}: ${e.data?.m ?? ""}`);
  const vital = (name: string) => {
    const v = events.filter((e) => e.kind === "vital" && e.data?.n === name).map((e) => Number(e.data?.v)).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length * 0.75)] : null;
  };
  const lcp = vital("LCP");
  const inp = vital("INP");

  const open = (carts.data ?? []).filter((c) => c.status === "open" || c.status === "expired");
  const recovered = (carts.data ?? []).filter((c) => c.status === "converted").length;
  const leftValue = open.reduce((n, c) => n + (c.subtotal_kobo ?? 0), 0);
  const nowHere = (live.data ?? []) as Session[];

  return (
    <>
      <PageHead eyebrow="Studio" title="Insights">
        <div className="flex gap-1 rounded-2xl bg-cream-deep p-1">
          {RANGES.map((r) => (
            <Link key={r.d} href={adminHref(`/insights?d=${r.d}`)} aria-current={days === r.d ? "page" : undefined} className={`rounded-xl px-4 py-2 text-sm ${days === r.d ? "bg-paper shadow-[0_1px_0_var(--color-line)]" : "text-ink-soft"}`}>{r.label}</Link>
          ))}
        </div>
      </PageHead>
      <LiveRefresh />

      <div className="space-y-4">
        <Card className="bg-dark text-paper">
          <div className="flex items-center gap-3">
            <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-honey opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-honey" /></span>
            <p className="font-serif text-3xl">{nowHere.length} on the site right now</p>
          </div>
          {nowHere.length > 0 && (
            <ul className="mt-4 divide-y divide-paper/10 text-sm">
              {nowHere.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate">{pageName(s.path)} <span className="text-paper/55">· {s.scroll ?? 0}% down the page</span></span>
                  <span className="shrink-0 text-xs text-paper/55">{[s.device, s.city || s.country].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Visits" value={visits} />
          <Stat label="Paid" value={funnel[5].n} hint={`${pct(funnel[5].n, visits)}% of visits`} />
          <Stat label="Left in bags" value={formatNaira(leftValue)} hint={`${open.length} unfinished`} />
          <Stat label="Came back & paid" value={recovered} hint="after leaving their bag" />
        </div>

        <Card>
          <p className="eyebrow">The journey</p>
          <h2 className="mt-1 mb-5 font-serif text-3xl">Where people drop off</h2>
          <ol className="space-y-3">
            {funnel.map((f, i) => {
              const prev = i ? funnel[i - 1].n : f.n;
              return (
                <li key={f.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{f.label}</span>
                    <span className="tabular-nums">{f.n.toLocaleString("en-NG")}{i > 0 && prev > 0 && <span className="ml-2 text-xs text-muted">{pct(prev - f.n, prev)}% left here</span>}</span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-cream-deep"><div className="h-full rounded-full bg-gradient-to-r from-honey to-amber" style={{ width: `${Math.max(f.n ? 2 : 0, pct(f.n, visits))}%` }} /></div>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="eyebrow">Where they got stuck</p>
            <h2 className="mt-1 mb-4 font-serif text-2xl">Checkout: the box they stopped at</h2>
            <Bars rows={abandon} total={abandon.reduce((n, r) => n + r[1], 0)} empty="Nobody has left checkout part-way yet." name={(k) => FIELD_NAMES[k] ?? k} />
            <h2 className="mt-7 mb-4 font-serif text-2xl">Frustrated tapping</h2>
            <p className="-mt-2 mb-3 text-xs text-muted">Three quick taps on one spot usually means something looked tappable but didn’t respond.</p>
            <Bars rows={rage} total={rage.reduce((n, r) => n + r[1], 0)} empty="No frustrated tapping. Lovely." />
            {errors.length > 0 && (
              <>
                <h2 className="mt-7 mb-4 font-serif text-2xl">Errors visitors hit</h2>
                <Bars rows={errors} total={errors.reduce((n, r) => n + r[1], 0)} empty="" />
              </>
            )}
          </Card>
          <Card>
            <p className="eyebrow">Unfinished bags</p>
            <h2 className="mt-1 mb-4 font-serif text-2xl">People to follow up</h2>
            <ul className="divide-y divide-line">
              {open.slice(0, 12).map((c) => {
                const items = ((c.lines ?? []) as { name: string; qty: number }[]).map((l) => `${l.name} × ${l.qty}`).join(", ");
                return (
                  <li key={c.id} className="py-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="truncate">{c.full_name || c.email}</span><span className="shrink-0 tabular-nums">{formatNaira(c.subtotal_kobo ?? 0)}</span></div>
                    <p className="mt-0.5 truncate text-xs text-muted">{items} · {ago(c.updated_at, now)} · {c.reminders_sent} reminder{c.reminders_sent === 1 ? "" : "s"} sent</p>
                    <div className="mt-1.5 flex gap-4 text-xs">
                      {c.phone && <a className="link-underline" href={waLink(c.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}
                      <a className="link-underline" href={`mailto:${c.email}`}>Email</a>
                    </div>
                  </li>
                );
              })}
              {!open.length && <li className="py-3 text-sm text-muted">No unfinished bags in this period.</li>}
            </ul>
          </Card>
        </div>

        <Card>
          <p className="eyebrow">Pages</p>
          <h2 className="mt-1 mb-4 font-serif text-2xl">What they read, and how far</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="text-left text-xs tracking-[0.12em] text-muted uppercase"><th className="pb-2 font-normal">Page</th><th className="pb-2 font-normal">Views</th><th className="pb-2 font-normal">Avg time</th><th className="pb-2 font-normal">Avg scroll</th></tr></thead>
              <tbody className="divide-y divide-line">
                {pages.map((p) => (
                  <tr key={p.path}><td className="py-2.5 pr-3">{pageName(p.path)}</td><td className="tabular-nums">{p.views}</td><td className="tabular-nums">{p.sec >= 60 ? `${Math.floor(p.sec / 60)}m ${p.sec % 60}s` : `${p.sec}s`}</td><td className="tabular-nums">{p.scroll}%</td></tr>
                ))}
              </tbody>
            </table>
            {!pages.length && <p className="pt-2 text-sm text-muted">No visits in this period yet.</p>}
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="eyebrow mb-4">Where they came from</p><Bars rows={tally(sessions, (s) => s.source)} total={visits} empty="Nothing yet." /></Card>
          <Card><p className="eyebrow mb-4">Where they are</p><Bars rows={tally(sessions, (s) => s.city || s.country)} total={visits} empty="Nothing yet." /></Card>
          <Card>
            <p className="eyebrow mb-4">Devices</p>
            <Bars rows={tally(sessions, (s) => s.device)} total={visits} empty="Nothing yet." />
            {(lcp !== null || inp !== null) && (
              <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
                Real speed for most visitors: {lcp !== null && <>main content in {(lcp / 1000).toFixed(1)}s ({lcp <= 2500 ? "good" : "slow"})</>}{lcp !== null && inp !== null && ", "}{inp !== null && <>taps answered in {inp}ms ({inp <= 200 ? "good" : "slow"})</>}.
              </p>
            )}
          </Card>
        </div>

        <p className="text-xs text-muted">Visits are anonymous: no screen recording, nothing typed, no IP addresses. Kept 90 days. Visitors who chose “Essentials only” aren’t counted, so true numbers can be a little higher.</p>
      </div>
    </>
  );
}
