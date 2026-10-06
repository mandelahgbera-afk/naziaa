import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { Card, PageHead, StatusBadge } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/catalog";
import { NEXT_STATUSES, STATUS_LABEL } from "@/lib/order-status";

export default async function OrderDetail({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const [{ data: o }, { data: events }, { data: riders }, { data: complaints }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, zone:delivery_zones(name, uses_courier), rider:riders(name, phone), items:order_items(name, qty, unit_price_kobo, batch:batches(code)), customer:customers(id, marketing_opt_in)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("order_events").select("id, kind, from_status, to_status, message, created_at").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("riders").select("id, name").eq("is_active", true).order("name"),
    supabase.from("complaints").select("id, category, body, status, created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!o) notFound();

  const address = o.address as { line1?: string; area?: string; city?: string; state?: string; landmark?: string; lat?: number | null; lng?: number | null };
  const mapLink = address.lat && address.lng ? `https://www.google.com/maps/dir/?api=1&destination=${address.lat},${address.lng}` : null;
  const late = o.promised_by && new Date(o.promised_by) < new Date() && ["paid", "packed", "assigned", "out_for_delivery"].includes(o.status);
  type Item = { name: string; qty: number; unit_price_kobo: number; batch: { code: string } | null };

  return (
    <>
      <Link href="/admin/orders" className="eyebrow link-underline">← Orders</Link>
      <PageHead eyebrow={`Order ${o.ref}`} title={o.full_name}>
        <StatusBadge status={o.status} />
      </PageHead>

      {late && <p className="mb-6 rounded-2xl bg-[#fbeee9] px-5 py-3 text-sm text-[#7a2e12]">Running late — promised by {new Date(o.promised_by!).toLocaleString("en-NG", { weekday: "short", hour: "numeric", minute: "2-digit" })}.</p>}

      {/* phones: contact + next move first, where the thumb is */}
      <div className="mb-4 space-y-4 xl:hidden">
        <div className="grid grid-cols-3 gap-2">
          <a href={`tel:${o.phone}`} className="pressable rounded-2xl bg-paper py-3 text-center text-sm">Call</a>
          <a href={`https://wa.me/${o.phone.replace(/D/g, "").replace(/^0/, "234")}`} target="_blank" rel="noreferrer" className="pressable rounded-2xl bg-paper py-3 text-center text-sm">WhatsApp</a>
          {mapLink ? <a href={mapLink} target="_blank" rel="noreferrer" className="pressable rounded-2xl bg-paper py-3 text-center text-sm">Map</a> : <a href={`mailto:${o.email}`} className="pressable rounded-2xl bg-paper py-3 text-center text-sm">Email</a>}
        </div>
        <OrderActions orderId={o.id} status={o.status} next={NEXT_STATUSES[o.status] ?? []} riders={riders ?? []} riderId={o.rider_id} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <p className="eyebrow mb-4">Items</p>
            <ul className="divide-y divide-line">
              {(o.items as Item[]).map((i, n) => (
                <li key={n} className="flex justify-between py-3">
                  <span>{i.name} × {i.qty}{i.batch ? <span className="ml-2 text-xs text-muted">batch {i.batch.code}</span> : null}</span>
                  <span>{formatNaira(i.unit_price_kobo * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-ink-soft">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(o.subtotal_kobo)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{formatNaira(o.delivery_fee_kobo)}</dd></div>
              {o.discount_kobo > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{formatNaira(o.discount_kobo)}</dd></div>}
              <div className="flex justify-between font-serif text-xl text-ink"><dt>Total</dt><dd>{formatNaira(o.total_kobo)}</dd></div>
            </dl>
            {o.gift_wrap && (
              <p className="mt-4 rounded-2xl bg-[#efe6ef] px-4 py-3 text-sm text-[#5b4a70]">
                Gift wrap{o.gift_note ? <>: “{o.gift_note}”</> : null}
              </p>
            )}
          </Card>

          <div className="hidden xl:block">
          <OrderActions
            orderId={o.id}
            status={o.status}
            next={NEXT_STATUSES[o.status] ?? []}
            riders={riders ?? []}
            riderId={o.rider_id}
          />
          </div>

          <Card>
            <p className="eyebrow mb-4">Timeline</p>
            <ol className="space-y-4">
              {(events ?? []).map((e) => (
                <li key={e.id} className="flex gap-4">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-amber" />
                  <div>
                    <p className="text-sm">
                      {e.kind === "status" ? <>Moved to <strong className="font-normal">{STATUS_LABEL[e.to_status ?? ""] ?? e.to_status}</strong></> : e.message}
                    </p>
                    <p className="text-xs text-muted">{new Date(e.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {e.kind}</p>
                  </div>
                </li>
              ))}
              <li className="flex gap-4">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-sand" />
                <p className="text-sm text-muted">Order placed {new Date(o.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              </li>
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="eyebrow mb-3">Customer</p>
            <p className="font-serif text-2xl">{o.full_name}</p>
            <p className="text-sm text-ink-soft">{o.email}</p>
            <p className="text-sm text-ink-soft">{o.phone}</p>
            <div className="mt-3 flex gap-3 text-xs">
              <a className="link-underline" href={`tel:${o.phone}`}>Call</a>
              <a className="link-underline" href={`https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "234")}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="link-underline" href={`mailto:${o.email}`}>Email</a>
            </div>
          </Card>
          <Card>
            <p className="eyebrow mb-3">Delivery</p>
            <p>{[address.line1, address.area, address.city, address.state].filter(Boolean).join(", ")}</p>
            {address.landmark && <p className="mt-1 text-sm text-muted">Landmark: {address.landmark}</p>}
            <p className="mt-3 text-sm text-ink-soft">{o.zone?.name ?? "—"}{o.delivery_window ? ` · ${o.delivery_window}` : ""}</p>
            {o.promised_by && <p className="text-sm text-ink-soft">Promised by {new Date(o.promised_by).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric" })}</p>}
            {mapLink && <a href={mapLink} target="_blank" rel="noreferrer" className="link-underline mt-3 inline-block text-xs tracking-[0.16em] uppercase">Open pin in maps</a>}
            <p className="mt-4 text-xs text-muted">Delivery code <span className="ml-1 font-mono text-sm tracking-[0.2em] text-ink">{o.delivery_code}</span></p>
            {o.rider && <p className="mt-2 text-sm">Rider: {o.rider.name} · <a className="underline" href={`tel:${o.rider.phone}`}>{o.rider.phone}</a></p>}
            {o.failed_reason && <p className="mt-2 text-sm text-[#7a2e12]">Failed: {o.failed_reason}</p>}
            {o.delivery_rating && <p className="mt-2 text-sm">Rated {o.delivery_rating}/5{o.delivery_feedback ? ` — “${o.delivery_feedback}”` : ""}</p>}
          </Card>
          <Card>
            <p className="eyebrow mb-3">Payment</p>
            <p className="text-sm text-ink-soft">{o.payment_provider} · {o.provider_tx_id ?? "not yet paid"}</p>
            {o.paid_at && <p className="text-sm text-ink-soft">Paid {new Date(o.paid_at).toLocaleString("en-NG")}</p>}
          </Card>
          {complaints && complaints.length > 0 && (
            <Card>
              <p className="eyebrow mb-3">Complaints</p>
              <ul className="space-y-3">
                {complaints.map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="capitalize">{c.category.replace("_", " ")}</span> · <span className="text-muted">{c.status.replace("_", " ")}</span>
                    <p className="text-ink-soft">{c.body}</p>
                  </li>
                ))}
              </ul>
              <Link href="/admin/complaints" className="link-underline mt-3 inline-block text-xs uppercase tracking-[0.16em]">Resolve</Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
