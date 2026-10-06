import Link from "next/link";
import { Card, Empty, PageHead } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/catalog";
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
      <div className="mb-6 flex flex-wrap gap-2">
        {SEGMENTS.map((s) => (
          <Link key={s.id} href={`/admin/customers?seg=${s.id}`} className={`rounded-full px-4 py-2 text-sm transition ${seg === s.id ? "bg-dark text-paper" : "bg-paper hover:bg-cream-deep"}`}>
            {s.label}
          </Link>
        ))}
      </div>
      {active && "hint" in active && <p className="-mt-2 mb-6 text-sm text-muted">{active.hint}</p>}

      <Card>
        {filtered.length ? (
          <div className="overflow-x-auto">
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
        ) : (
          <Empty>No customers in this segment yet.</Empty>
        )}
      </Card>
    </>
  );
}
