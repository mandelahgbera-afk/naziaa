import Link from "next/link";
import { Card, Empty, PageHead, Stat, StatusBadge } from "@/components/admin/ui";
import { RevenueSpark } from "@/components/admin/revenue-spark";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/catalog";
import { adminHref } from "@/lib/admin-path";
import { dashboardWindow } from "@/lib/time";

const PAID = ["paid", "packed", "assigned", "out_for_delivery", "delivered"];

export default async function Dashboard() {
  const { supabase, profile } = await requireStaff();
  const { since, startOfToday, weekAgo, now } = dashboardWindow(14);

  const [recentRes, openRes, lateRes, complaintsRes, ratingRes, batchesRes, latestRes] = await Promise.all([
    supabase.from("orders").select("total_kobo, paid_at, status").gte("paid_at", since.toISOString()).in("status", PAID),
    supabase.from("orders").select("status").in("status", ["paid", "packed", "assigned", "out_for_delivery"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "packed", "assigned", "out_for_delivery"]).lt("promised_by", now.toISOString()),
    supabase.from("complaints").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("orders").select("delivery_rating").not("delivery_rating", "is", null).order("delivered_at", { ascending: false }).limit(50),
    supabase.from("batches").select("code, qty_available, product:products(name, low_stock_threshold, track_inventory)").order("infused_on", { ascending: false }),
    supabase.from("orders").select("id, ref, full_name, total_kobo, status, created_at").neq("status", "pending_payment").order("created_at", { ascending: false }).limit(8),
  ]);

  const recent = recentRes.data ?? [];
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 864e5);
    const key = d.toISOString().slice(0, 10);
    const total = recent.filter((o) => o.paid_at?.slice(0, 10) === key).reduce((n, o) => n + o.total_kobo, 0);
    return { day: key, total };
  });
  const today = recent.filter((o) => o.paid_at && new Date(o.paid_at) >= startOfToday);
  const week = recent.filter((o) => o.paid_at && new Date(o.paid_at) >= weekAgo);
  const weekRevenue = week.reduce((n, o) => n + o.total_kobo, 0);
  const open = openRes.data ?? [];
  const count = (s: string) => open.filter((o) => o.status === s).length;
  const ratings = (ratingRes.data ?? []).map((r) => r.delivery_rating as number);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  type BatchRow = { code: string; qty_available: number; product: { name: string; low_stock_threshold: number; track_inventory: boolean } | null };
  const low = ((batchesRes.data ?? []) as unknown as BatchRow[]).filter((b) => b.product?.track_inventory && b.qty_available <= (b.product?.low_stock_threshold ?? 0));

  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHead eyebrow={now.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })} title={`${greet}, ${(profile.full_name ?? "").split(" ")[0] || "there"}.`}>
        <Link href={adminHref("/orders")} className="btn btn-dark hidden md:inline-flex">Open the order board</Link>
      </PageHead>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Stat label="Today" value={formatNaira(today.reduce((n, o) => n + o.total_kobo, 0))} hint={`${today.length} order${today.length === 1 ? "" : "s"}`} />
        <Stat label="Last 7 days" value={formatNaira(weekRevenue)} hint={`${week.length} orders · avg ${week.length ? formatNaira(Math.round(weekRevenue / week.length)) : "—"}`} />
        <Stat label="Running late" value={lateRes.count ?? 0} tone={(lateRes.count ?? 0) > 0 ? "warn" : "good"} hint="past their promised time" />
        <Stat label="Delivery rating" value={avgRating} hint={`from the last ${ratings.length} ratings`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">Revenue · 14 days</p>
            <p className="text-sm text-muted">{formatNaira(days.reduce((n, d) => n + d.total, 0))}</p>
          </div>
          <RevenueSpark days={days} />
        </Card>
        <Card>
          <p className="eyebrow">Right now</p>
          <ul className="mt-5 space-y-3">
            {[
              ["paid", "To pack"],
              ["packed", "Packed, needs a rider"],
              ["assigned", "With riders"],
              ["out_for_delivery", "On the road"],
            ].map(([s, l]) => (
              <li key={s} className="flex items-center justify-between">
                <span className="text-ink-soft">{l}</span>
                <span className="font-serif text-2xl">{count(s)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-line pt-3">
              <Link href={adminHref("/complaints")} className="text-ink-soft underline-offset-4 hover:underline">Open complaints</Link>
              <span className={`font-serif text-2xl ${(complaintsRes.count ?? 0) > 0 ? "text-[#a0441a]" : ""}`}>{complaintsRes.count ?? 0}</span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <p className="eyebrow mb-4">Latest orders</p>
          {latestRes.data?.length ? (
            <ul className="divide-y divide-line">
              {latestRes.data.map((o) => (
                <li key={o.id}>
                  <Link href={adminHref(`/orders/${o.id}`)} className="flex items-center justify-between gap-4 py-3 hover:text-amber">
                    <span className="w-24 font-mono text-xs text-muted">{o.ref}</span>
                    <span className="flex-1 truncate">{o.full_name}</span>
                    <StatusBadge status={o.status} />
                    <span className="w-24 text-right text-sm">{formatNaira(o.total_kobo)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No orders yet — they’ll appear here the moment someone pays.</Empty>
          )}
        </Card>
        <Card>
          <p className="eyebrow mb-4">Stock watch</p>
          {low.length ? (
            <ul className="space-y-3">
              {low.map((b) => (
                <li key={b.code} className="flex justify-between">
                  <span>{b.product?.name} · {b.code}</span>
                  <span className="text-[#a0441a]">{b.qty_available} left</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing running low. Batches you track appear here when they dip under their threshold.</p>
          )}
        </Card>
      </div>
    </>
  );
}
