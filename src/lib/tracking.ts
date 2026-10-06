import { supabaseAdmin } from "./supabase/admin";

/* Guest order access: the order ref plus its secret tracking token (from the
   confirmation email). No account needed, nothing guessable. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getTrackedOrder(ref: string, token: string | null) {
  if (!token || !UUID.test(token) || !/^NZ-[A-Z0-9]{6}$/.test(ref)) return null;
  const { data } = await supabaseAdmin()
    .from("orders")
    .select(
      `id, ref, status, full_name, created_at, paid_at, assigned_at, out_for_delivery_at, delivered_at, promised_by,
       delivery_window, delivery_code, delivery_rating, address, total_kobo, failed_reason, rider_id,
       zone:delivery_zones(name, uses_courier),
       rider:riders(name),
       items:order_items(name, qty, unit_price_kobo, slug)`,
    )
    .eq("ref", ref)
    .eq("tracking_token", token)
    .maybeSingle();
  return data;
}

export type TrackedOrder = NonNullable<Awaited<ReturnType<typeof getTrackedOrder>>>;
