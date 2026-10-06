import Link from "next/link";
import { OrderBoard, type BoardOrder } from "@/components/admin/order-board";
import { Card, PageHead, StatusBadge } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/catalog";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const { supabase } = await requireStaff();
  const q = (await searchParams).q;
  const search = typeof q === "string" ? q.trim() : "";

  const [{ data: open }, { data: riders }, { data: done }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, ref, full_name, phone, status, total_kobo, promised_by, delivery_window, created_at, gift_wrap, rider_id, zone:delivery_zones(name), rider:riders(name), items:order_items(qty)")
      .in("status", ["paid", "packed", "assigned", "out_for_delivery", "failed"])
      .order("created_at", { ascending: true }),
    supabase.from("riders").select("id, name, zone_id").eq("is_active", true).order("name"),
    (() => {
      let qb = supabase.from("orders").select("id, ref, full_name, status, total_kobo, created_at").in("status", ["delivered", "returned", "cancelled", "refunded", "pending_payment"]).order("created_at", { ascending: false }).limit(30);
      if (search) qb = qb.or(`ref.ilike.%${search.replace(/[%,]/g, "")}%,full_name.ilike.%${search.replace(/[%,]/g, "")}%,email.ilike.%${search.replace(/[%,]/g, "")}%`);
      return qb;
    })(),
  ]);

  return (
    <>
      <PageHead eyebrow="Fulfilment" title="Orders" />
      <OrderBoard orders={(open ?? []) as unknown as BoardOrder[]} riders={riders ?? []} />

      <Card className="mt-10">
        <form className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="eyebrow">History</p>
          <input name="q" defaultValue={search} placeholder="Search ref, name or email" className="w-full rounded-full border border-line bg-cream px-4 py-2 text-sm outline-none focus:border-amber sm:w-72" />
        </form>
        <ul className="divide-y divide-line">
          {(done ?? []).map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 py-3 hover:text-amber">
                <span className="w-24 font-mono text-xs text-muted">{o.ref}</span>
                <span className="flex-1 truncate">{o.full_name}</span>
                <span className="hidden text-xs text-muted sm:block">{new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                <StatusBadge status={o.status} />
                <span className="w-24 text-right text-sm">{formatNaira(o.total_kobo)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
