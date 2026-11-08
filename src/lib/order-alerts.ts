import type { SupabaseClient } from "@supabase/supabase-js";

/* New-order emails to whoever runs the shop. They live in their own private
   settings row: the storefront row is readable by every visitor, and the
   address alerts go to is nobody else's business. */

export type OrderAlerts = { enabled: boolean; email: string };
export const ORDER_ALERTS_KEY = "order_alerts";

export async function readOrderAlerts(db: SupabaseClient): Promise<OrderAlerts> {
  const { data } = await db.from("site_settings").select("value").eq("key", ORDER_ALERTS_KEY).maybeSingle();
  const v = (data?.value ?? {}) as Partial<OrderAlerts>;
  return { enabled: v.enabled !== false, email: typeof v.email === "string" ? v.email : "" };
}
