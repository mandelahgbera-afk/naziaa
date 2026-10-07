import Link from "next/link";
import { Card, Empty, PageHead } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/catalog";
import { adminHref } from "@/lib/admin-path";
import { daysSince } from "@/lib/time";

const SEGMENTS = [
  { id: "all", label: "Everyone" },
  { id: "refill", label: "Due a refill", hint: "Last order 30–60 days ago — a 50ml bottle used three times a week is running low." },
  { id: "lapsed", label: "Lapsed", hint: "No order in 90+ days." },
  { id: "repeat", label: "Repeat customers", hint: "Two or more orders." },
  { id: "subscribed", label: "Newsletter opt-in" },
] as const;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const { supabase } = await requireStaff();
  const sp = await searchParams;
  const seg = (typeof sp.seg === "string" ? sp.seg : "all") as (typeof SEGMENTS)[number]["id"];

  const { data } = await supabase
    .from("customers")
    .select("id, email, phone, full_name, marketing_opt_in, created_at, orders(total_kobo, status, created_at)")
    .order("created_at", { ascending: false })
    .limit(500);

  const PAID = new Set(["paid", "packed", "assigned", "out_for_delivery", "delivered"]);
  const rows = (data ?? []).map((c) => {
    const orders = (c.orders as { total_kobo: number; status: string; created_at: string }[]).filter((o) => PAID.has(o.status));
    const last = orders.map((o) => o.created_at).sort().at(-1) ?? null;
    const days = last ? daysSince(last) : null;
    return { ...c, count: orders.length, ltv: orders.reduce((n, o) => n + o.total_kobo, 0), last, days };
  });

  const filtered = rows.filter((r) => {
    if (seg === "refill") return r.days !== null && r.days >= 30 && r.days <= 60;
    if (seg === "lapsed") return r.days !== null && r.days > 90;
    if (seg === "repeat") return r.count >= 2;
    if (seg === "subscribed") return r.marketing_opt_in;
    return true;
  });
  const active = SEGMENTS.find((s) => s.id === seg);

  return (
    <>
      <PageHead eyebrow="Relationships" title="Customers" />
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {SEGMENTS.map((s) => (
          <Link key={s.id} href={adminHref(`/customers?seg=${s.id}`)} className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${seg === s.id ? "bg-dark text-paper" : "bg-paper hover:bg-cream-deep"}`}>
            {s.label}
          </Link>
        ))}
      </div>
      {active && "hint" in active && <p className="-mt-2 mb-6 text-sm text-muted">{active.hint}</p>}

      <Card>
        {filtered.length ? (
          <>
          <ul className="divide-y divide-line md:hidden">
            {filtered.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-serif text-lg">{c.full_name ?? c.email}</p>
                  <p className="shrink-0 text-sm">{formatNaira(c.ltv)}</p>
                </div>
                <p className="text-xs text-muted">{c.count} order{c.count === 1 ? "" : "s"} · {c.days === null ? "no orders yet" : c.days === 0 ? "ordered today" : `last ${c.days}d ago`}</p>
                <div className="mt-2 flex gap-2">
                  {c.phone && <a className="pressable rounded-full bg-cream px-3 py-1.5 text-xs" href={`https://wa.me/${c.phone.replace(/D/g, "").replace(/^0/, "234")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                  <a className="pressable rounded-full bg-cream px-3 py-1.5 text-xs" href={`mailto:${c.email}`}>Email</a>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs tracking-[0.12em] text-muted uppercase">
                <tr>
                  <th className="pb-3 font-normal">Customer</th>
                  <th className="pb-3 font-normal">Orders</th>
                  <th className="pb-3 font-normal">Lifetime</th>
                  <th className="pb-3 font-normal">Last order</th>
                  <th className="pb-3 font-normal">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3">
                      <p className="font-serif text-lg">{c.full_name ?? "—"}</p>
                      <p className="text-xs text-muted">{c.email}{c.marketing_opt_in ? " · newsletter" : ""}</p>
                    </td>
                    <td>{c.count}</td>
                    <td>{formatNaira(c.ltv)}</td>
                    <td>{c.days === null ? "—" : c.days === 0 ? "Today" : `${c.days} days ago`}</td>
                    <td className="space-x-3 text-xs">
                      {c.phone && <a className="link-underline" href={`https://wa.me/${c.phone.replace(/\D/g, "").replace(/^0/, "234")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                      <a className="link-underline" href={`mailto:${c.email}`}>Email</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <Empty>No customers in this segment yet.</Empty>
        )}
      </Card>
    </>
  );
}
