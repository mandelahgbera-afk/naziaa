import type { Metadata } from "next";
import { RiderApp, type Job } from "@/components/rider/rider-app";
import { requireRider } from "@/lib/auth";

export const metadata: Metadata = { title: "Deliveries", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RiderPage() {
  const { supabase, profile } = await requireRider();
  const { data: rider } = await supabase.from("riders").select("id, name").eq("profile_id", profile.id).maybeSingle();
  const { data: jobs } = rider
    ? await supabase
        .from("orders")
        .select("id, ref, full_name, phone, status, address, delivery_window, promised_by, gift_wrap, items:order_items(name, qty)")
        .eq("rider_id", rider.id)
        .in("status", ["assigned", "out_for_delivery"])
        .order("promised_by", { ascending: true })
    : { data: [] };
  const { count: doneToday } = rider
    ? await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("rider_id", rider.id)
        .eq("status", "delivered")
        .gte("delivered_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    : { count: 0 };

  return <RiderApp riderId={rider?.id ?? null} name={rider?.name ?? profile.full_name ?? "Rider"} jobs={(jobs ?? []) as unknown as Job[]} doneToday={doneToday ?? 0} />;
}
