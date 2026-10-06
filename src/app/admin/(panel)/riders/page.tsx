import { AddRiderForm, RiderToggle } from "@/components/admin/rider-forms";
import { RidersLiveMap } from "@/components/admin/riders-live-map";
import { Card, Empty, PageHead } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { daysAgoIso } from "@/lib/time";

export default async function RidersPage() {
  const { supabase } = await requireStaff();
  const since = daysAgoIso(30);
  const [{ data: riders }, { data: zones }, { data: orders }, { data: locations }, { data: complaints }] = await Promise.all([
    supabase.from("riders").select("id, name, phone, vehicle, is_active, zone:delivery_zones(name)").order("is_active", { ascending: false }).order("name"),
    supabase.from("delivery_zones").select("id, name").order("sort"),
    supabase.from("orders").select("rider_id, status, promised_by, delivered_at, delivery_rating").not("rider_id", "is", null).gte("created_at", since),
    supabase.from("rider_locations").select("rider_id, lat, lng, updated_at"),
    supabase.from("complaints").select("rider_id").not("rider_id", "is", null).gte("created_at", since),
  ]);

  const stats = (id: string) => {
    const mine = (orders ?? []).filter((o) => o.rider_id === id);
    const delivered = mine.filter((o) => o.status === "delivered" && o.delivered_at);
    const onTime = delivered.filter((o) => !o.promised_by || new Date(o.delivered_at!) <= new Date(o.promised_by));
    const rated = delivered.filter((o) => o.delivery_rating);
    return {
      delivered: delivered.length,
      failed: mine.filter((o) => o.status === "failed").length,
      active: mine.filter((o) => o.status === "assigned" || o.status === "out_for_delivery").length,
      onTime: delivered.length ? Math.round((onTime.length / delivered.length) * 100) : null,
      rating: rated.length ? (rated.reduce((n, o) => n + (o.delivery_rating ?? 0), 0) / rated.length).toFixed(1) : null,
      complaints: (complaints ?? []).filter((c) => c.rider_id === id).length,
    };
  };

  return (
    <>
      <PageHead eyebrow="Delivery team" title="Riders" />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <RidersLiveMap riders={(riders ?? []).map((r) => ({ id: r.id, name: r.name }))} initial={locations ?? []} />
          <Card>
            <p className="eyebrow mb-4">Last 30 days</p>
            {riders?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs tracking-[0.12em] text-muted uppercase">
                    <tr>
                      <th className="pb-3 font-normal">Rider</th>
                      <th className="pb-3 font-normal">Delivered</th>
                      <th className="pb-3 font-normal">On time</th>
                      <th className="pb-3 font-normal">Rating</th>
                      <th className="pb-3 font-normal">Failed</th>
                      <th className="pb-3 font-normal">Complaints</th>
                      <th className="pb-3 font-normal" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {riders.map((r) => {
                      const s = stats(r.id);
                      return (
                        <tr key={r.id} className={r.is_active ? "" : "opacity-50"}>
                          <td className="py-3">
                            <p className="font-serif text-lg">{r.name}</p>
                            <p className="text-xs text-muted">{r.phone}{r.vehicle ? ` · ${r.vehicle}` : ""}{zoneName(r.zone) ? ` · ${zoneName(r.zone)}` : ""}</p>
                            {s.active > 0 && <p className="text-xs text-amber">{s.active} on the go</p>}
                          </td>
                          <td>{s.delivered}</td>
                          <td className={s.onTime !== null && s.onTime < 80 ? "text-[#a0441a]" : ""}>{s.onTime === null ? "—" : `${s.onTime}%`}</td>
                          <td>{s.rating ?? "—"}</td>
                          <td>{s.failed}</td>
                          <td className={s.complaints ? "text-[#a0441a]" : ""}>{s.complaints}</td>
                          <td className="text-right"><RiderToggle id={r.id} active={r.is_active} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No riders yet. Add your first rider to start assigning deliveries.</Empty>
            )}
          </Card>
        </div>
        <Card className="self-start">
          <p className="eyebrow mb-1">Add a rider</p>
          <p className="mb-5 text-sm text-muted">They’ll sign in at <span className="font-mono">/rider</span> with this email and password.</p>
          <AddRiderForm zones={zones ?? []} />
        </Card>
      </div>
    </>
  );
}

function zoneName(z: unknown): string | null {
  const one = Array.isArray(z) ? z[0] : z;
  return one && typeof one === "object" && "name" in one ? String((one as { name: string }).name) : null;
}
