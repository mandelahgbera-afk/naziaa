import { supabaseAdmin } from "@/lib/supabase/admin";

/* Practice data from scripts/demo-data.mjs is tagged so it can be removed exactly:
   emails end @nazia-demo.invalid, rider phones start +23480000000. Real records never match. */
const EMAIL = "%@nazia-demo.invalid";
const RIDER_PHONE = "+23480000000%";

export type DemoCounts = { orders: number; customers: number; riders: number; bags: number; subscribers: number };

export async function demoCounts(): Promise<DemoCounts> {
  const db = supabaseAdmin();
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: n, error } = await q;
    if (error) throw error;
    return n ?? 0;
  };
  const head = { count: "exact", head: true } as const;
  const [orders, customers, riders, bags, subscribers] = await Promise.all([
    count(db.from("orders").select("id", head).like("email", EMAIL)),
    count(db.from("customers").select("id", head).like("email", EMAIL)),
    count(db.from("riders").select("id", head).like("phone", RIDER_PHONE)),
    count(db.from("checkout_sessions").select("id", head).like("email", EMAIL)),
    count(db.from("newsletter_subscribers").select("id", head).like("email", EMAIL)),
  ]);
  return { orders, customers, riders, bags, subscribers };
}

export async function clearDemo() {
  const db = supabaseAdmin();
  const must = async (q: PromiseLike<{ error: unknown }>) => {
    const { error } = await q;
    if (error) throw error;
  };
  const { data: orders, error: oe } = await db.from("orders").select("id").like("email", EMAIL);
  if (oe) throw oe;
  const { data: customers, error: ce } = await db.from("customers").select("id").like("email", EMAIL);
  if (ce) throw ce;
  const { data: riders, error: re } = await db.from("riders").select("id").like("phone", RIDER_PHONE);
  if (re) throw re;
  const orderIds = (orders ?? []).map((o) => o.id);
  const customerIds = (customers ?? []).map((c) => c.id);
  const riderIds = (riders ?? []).map((r) => r.id);

  if (orderIds.length) await must(db.from("complaints").delete().in("order_id", orderIds));
  if (customerIds.length) await must(db.from("complaints").delete().in("customer_id", customerIds));
  if (orderIds.length) await must(db.from("orders").delete().in("id", orderIds)); // items, events, proofs cascade
  await must(db.from("checkout_sessions").delete().like("email", EMAIL));
  await must(db.from("newsletter_subscribers").delete().like("email", EMAIL));
  await must(db.from("customers").delete().like("email", EMAIL));
  if (riderIds.length) await must(db.from("riders").delete().in("id", riderIds)); // locations cascade

  return { orders: orderIds.length, customers: customerIds.length, riders: riderIds.length };
}
