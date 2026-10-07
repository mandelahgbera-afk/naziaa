// Practice data for the Studio: realistic orders in every stage, riders, customers,
// complaints, ratings, abandoned bags and newsletter subscribers.
//
//   node scripts/demo-data.mjs seed    → remove any old demo data, then add a fresh set
//   node scripts/demo-data.mjs clear   → remove all demo data
//   node scripts/demo-data.mjs status  → count what demo data exists
//
// Everything demo is marked so it can be removed exactly:
//   customers/orders/subscribers/bags use emails ending @nazia-demo.invalid (a reserved
//   domain that can never receive mail — the site also refuses to send to it), and demo
//   riders use phone numbers starting +23480000000 and have no sign-in accounts.
// Products, prices, delivery areas and settings are never touched.

import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/\s+#.*$/, "").trim().replace(/^"|"$/g, "")]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Supabase URL / service key missing in .env.local");

const DOMAIN = "nazia-demo.invalid";
const RIDER_PHONE = "+23480000000";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

/** Batch inserts need identical keys on every row: fill gaps with null. */
function uniform(body) {
  if (!Array.isArray(body)) return body;
  const keys = [...new Set(body.flatMap((r) => Object.keys(r)))];
  return body.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));
}

async function rest(method, path, body, prefer = "return=representation") {
  body = uniform(body);
  const res = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, Prefer: prefer }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const like = (v) => encodeURIComponent(v);

// ─── time helpers ──────────────────────────────────────────────────────────
const NOW = Date.now();
const H1 = 3600_000;
const iso = (ms) => new Date(ms).toISOString();

// ─── people & places ───────────────────────────────────────────────────────
const CUSTOMERS = [
  ["Adaeze Okafor", "Lekki Phase 1", "12 Admiralty Way", "opposite the bank", 6.4474, 3.4723],
  ["Tolu Adeyemi", "Ikeja GRA", "5 Isaac John Street", "white gate, blue roof", 6.5788, 3.35],
  ["Chioma Nwosu", "Yaba", "21 Herbert Macaulay Way", "beside the pharmacy", 6.5095, 3.3711],
  ["Funke Bello", "Surulere", "8 Adeniran Ogunsanya", "", 6.4969, 3.3532],
  ["Amaka Eze", "Ikoyi", "3 Bourdillon Road", "estate gate 2", 6.452, 3.435],
  ["Zainab Yusuf", "Victoria Island", "14 Ajose Adeogun", "office reception", 6.4281, 3.4219],
  ["Kemi Ogunleye", "Ajah", "Abraham Adesanya Estate", "close to the church", 6.4698, 3.5852],
  ["Ifeoma Chukwu", "Gbagada", "9 Diya Street", "", 6.5531, 3.3891],
  ["Blessing Udo", "Magodo", "Phase 2, CMD Road", "security post", 6.623, 3.388],
  ["Halima Sani", "Wuse 2", "Aminu Kano Crescent", "plaza, 2nd floor", 9.07, 7.48],
  ["Yetunde Akin", "Lekki Phase 1", "Fola Osibo Road", "", 6.4421, 3.4801],
  ["Nneka Obi", "Yaba", "Akoka, Unilag road", "hostel gate", 6.5165, 3.3893],
  ["Bisi Lawal", "Ikoyi", "Glover Road", "", 6.4571, 3.4302],
  ["Ruth Danjuma", "Ikeja GRA", "Joel Ogunnaike", "", 6.5823, 3.3567],
].map(([name, area, line1, landmark, lat, lng], i) => ({
  name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${DOMAIN}`,
  phone: `+23490000001${String(i).padStart(2, "0")}`,
  address: { line1, area, city: area === "Wuse 2" ? "Abuja" : "Lagos", state: area === "Wuse 2" ? "FCT" : "Lagos", landmark: landmark || undefined, lat, lng },
}));

const RIDERS = [
  { name: "Tunde Bakare", phone: `${RIDER_PHONE}1`, zone: "Lagos Island", vehicle: "Motorbike" },
  { name: "Emeka Nnadi", phone: `${RIDER_PHONE}2`, zone: "Lekki & Ajah", vehicle: "Motorbike" },
  { name: "Musa Ibrahim", phone: `${RIDER_PHONE}3`, zone: "Lagos Mainland", vehicle: "Motorbike" },
];

// zone, fee (₦) and the promise in hours — set on the demo orders only
const ZONE_FOR = { "Lekki Phase 1": "Lekki & Ajah", Ajah: "Lekki & Ajah", Ikoyi: "Lagos Island", "Victoria Island": "Lagos Island", "Wuse 2": "Outside Lagos" };
const zoneOf = (area) => ZONE_FOR[area] ?? "Lagos Mainland";
const FEE = { "Lagos Island": 3000, "Lekki & Ajah": 3500, "Lagos Mainland": 2500, "Outside Lagos": 5000 };
const PROMISE_H = { "Lagos Island": 24, "Lekki & Ajah": 48, "Lagos Mainland": 24, "Outside Lagos": 120 };
const RIDER_FOR = { "Lagos Island": 0, "Lekki & Ajah": 1, "Lagos Mainland": 2 };

// ─── the orders ────────────────────────────────────────────────────────────
// c = customer, ago = hours since payment, items = [[slug, qty]], extras per stage
const RL = "rosemary-lavender";
const NPS = "nettle-pumpkin-seed";
const ORDERS = [
  // delivered over the past two weeks
  { c: 0, ago: 320, status: "delivered", items: [[RL, 1]], deliveredAfter: 20, rating: 5, feedback: "Emeka was so polite, and the bottle smells amazing." },
  { c: 1, ago: 300, status: "delivered", items: [[RL, 1], [NPS, 1]], deliveredAfter: 18, rating: 5 },
  { c: 2, ago: 270, status: "delivered", items: [[NPS, 2]], deliveredAfter: 22, rating: 4, feedback: "Came a bit later than I hoped, but well packed." },
  { c: 3, ago: 240, status: "delivered", items: [[RL, 1]], deliveredAfter: 30, rating: 3, feedback: "Arrived later than promised.", late: true },
  { c: 4, ago: 200, status: "delivered", items: [[RL, 2]], deliveredAfter: 16, rating: 5, gift: "Happy birthday, Sis — your hair ritual starts now ✨" },
  { c: 5, ago: 170, status: "delivered", items: [[NPS, 1]], deliveredAfter: 19, rating: 5 },
  { c: 9, ago: 150, status: "delivered", items: [[RL, 1], [NPS, 1]], deliveredAfter: 70, courier: true },
  { c: 6, ago: 130, status: "delivered", items: [[RL, 1]], deliveredAfter: 26, rating: 4 },
  { c: 7, ago: 100, status: "delivered", items: [[NPS, 1]], deliveredAfter: 17, rating: 5 },
  { c: 8, ago: 80, status: "delivered", items: [[RL, 3]], deliveredAfter: 21, rating: 5, feedback: "Ordering again for my mum." },
  { c: 0, ago: 55, status: "delivered", items: [[NPS, 1]], deliveredAfter: 20, rating: 5, feedback: "Second bottle, still in love." },
  { c: 10, ago: 40, status: "delivered", items: [[RL, 1]], deliveredAfter: 22 },
  // live right now
  { c: 11, ago: 1, status: "paid", items: [[RL, 1]] },
  { c: 12, ago: 3, status: "paid", items: [[RL, 1], [NPS, 1]], gift: "For you, with love — B." },
  { c: 13, ago: 27, status: "paid", items: [[NPS, 1]] }, // past its promise → shows as late
  { c: 1, ago: 6, status: "packed", items: [[RL, 2]] },
  { c: 3, ago: 9, status: "packed", items: [[NPS, 1]] },
  { c: 4, ago: 12, status: "assigned", items: [[RL, 1]] },
  { c: 5, ago: 14, status: "assigned", items: [[NPS, 2]] },
  { c: 6, ago: 20, status: "out_for_delivery", items: [[RL, 1]] },
  { c: 7, ago: 23, status: "out_for_delivery", items: [[RL, 1], [NPS, 1]] },
  { c: 2, ago: 30, status: "failed", items: [[RL, 1]], failedReason: "Customer not reachable — phone switched off" },
  { c: 8, ago: 60, status: "cancelled", items: [[NPS, 1]] },
  { c: 12, ago: 2, status: "pending_payment", items: [[RL, 1]] },
];

const ALPH = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ref = (i) => `NZ-D${ALPH[(i * 7) % ALPH.length]}${ALPH[(i * 13 + 3) % ALPH.length]}${ALPH[(i * 5 + 11) % ALPH.length]}${ALPH[(i * 3 + 17) % ALPH.length]}${ALPH[(i * 11 + 5) % ALPH.length]}`;

// ─── clear ─────────────────────────────────────────────────────────────────
async function clear() {
  const orders = await rest("GET", `orders?select=id&email=like.${like(`*@${DOMAIN}`)}`);
  const ids = orders.map((o) => o.id);
  if (ids.length) await rest("DELETE", `complaints?order_id=in.(${ids.join(",")})`, null, "return=minimal");
  const customers = await rest("GET", `customers?select=id&email=like.${like(`*@${DOMAIN}`)}`);
  if (customers.length) await rest("DELETE", `complaints?customer_id=in.(${customers.map((c) => c.id).join(",")})`, null, "return=minimal");
  if (ids.length) await rest("DELETE", `orders?id=in.(${ids.join(",")})`, null, "return=minimal"); // items, events, proofs cascade
  await rest("DELETE", `checkout_sessions?email=like.${like(`*@${DOMAIN}`)}`, null, "return=minimal");
  await rest("DELETE", `newsletter_subscribers?email=like.${like(`*@${DOMAIN}`)}`, null, "return=minimal");
  await rest("DELETE", `customers?email=like.${like(`*@${DOMAIN}`)}`, null, "return=minimal");
  await rest("DELETE", `riders?phone=like.${like(`${RIDER_PHONE}*`)}`, null, "return=minimal"); // locations cascade
  console.log(`Cleared demo data (${ids.length} orders, ${customers.length} customers, demo riders, bags, subscribers).`);
}

async function status() {
  const count = async (path) => (await rest("GET", path)).length;
  console.log({
    orders: await count(`orders?select=id&email=like.${like(`*@${DOMAIN}`)}`),
    customers: await count(`customers?select=id&email=like.${like(`*@${DOMAIN}`)}`),
    riders: await count(`riders?select=id&phone=like.${like(`${RIDER_PHONE}*`)}`),
    abandonedBags: await count(`checkout_sessions?select=id&email=like.${like(`*@${DOMAIN}`)}`),
    subscribers: await count(`newsletter_subscribers?select=id&email=like.${like(`*@${DOMAIN}`)}`),
  });
}

// ─── seed ──────────────────────────────────────────────────────────────────
async function seed() {
  await clear();

  const products = await rest("GET", "products?select=id,slug,name,price_kobo");
  const zones = await rest("GET", "delivery_zones?select=id,name");
  const P = Object.fromEntries(products.map((p) => [p.slug, p]));
  const Z = Object.fromEntries(zones.map((z) => [z.name, z.id]));
  for (const s of [RL, NPS]) if (!P[s]) throw new Error(`Product ${s} not found — run supabase/seed.sql first`);

  const riders = await rest(
    "POST",
    "riders",
    RIDERS.map((r) => ({ name: r.name, phone: r.phone, zone_id: Z[r.zone] ?? null, vehicle: r.vehicle, is_active: true })),
  );

  const customers = await rest(
    "POST",
    "customers",
    CUSTOMERS.map((c, i) => ({ email: c.email, phone: c.phone, full_name: c.name, marketing_opt_in: i % 3 !== 2 })),
  );
  const custByEmail = Object.fromEntries(customers.map((c) => [c.email, c.id]));

  const orderRows = [];
  const itemsFor = [];
  const eventsFor = [];

  ORDERS.forEach((o, i) => {
    const cust = CUSTOMERS[o.c];
    const zone = zoneOf(cust.address.area);
    const paidAt = NOW - o.ago * H1;
    const fee = FEE[zone] * 100;
    const subtotal = o.items.reduce((n, [slug, q]) => n + P[slug].price_kobo * q, 0);
    const promised = paidAt + PROMISE_H[zone] * H1;
    const riderIdx = RIDER_FOR[zone];
    const rider = riderIdx === undefined || o.courier ? null : riders[riderIdx];
    const st = o.status;
    const reached = (s) => ["paid", "packed", "assigned", "out_for_delivery", "delivered", "failed"].indexOf(st) >= ["paid", "packed", "assigned", "out_for_delivery", "delivered"].indexOf(s);

    const t = {
      packed: paidAt + 2 * H1,
      assigned: paidAt + 4 * H1,
      out: st === "delivered" ? paidAt + (o.deliveredAfter - 2) * H1 : st === "failed" ? paidAt + 24 * H1 : NOW - (i % 2 ? 50 : 25) * 60_000,
      delivered: st === "delivered" ? paidAt + o.deliveredAfter * H1 : null,
    };

    orderRows.push({
      ref: ref(i),
      customer_id: custByEmail[cust.email],
      email: cust.email,
      phone: cust.phone,
      full_name: cust.name,
      status: st,
      subtotal_kobo: subtotal,
      delivery_fee_kobo: fee,
      total_kobo: subtotal + fee,
      zone_id: Z[zone] ?? null,
      address: cust.address,
      delivery_window: ["morning", "afternoon", "evening"][i % 3],
      promised_by: iso(promised),
      gift_wrap: Boolean(o.gift),
      gift_note: o.gift ?? null,
      payment_provider: "flutterwave",
      payment_ref: st === "pending_payment" ? null : ref(i),
      provider_tx_id: st === "pending_payment" ? null : String(800000 + i * 37),
      paid_at: st === "pending_payment" ? null : iso(paidAt),
      rider_id: ["assigned", "out_for_delivery", "delivered", "failed"].includes(st) ? rider?.id ?? null : null,
      assigned_at: ["assigned", "out_for_delivery", "delivered", "failed"].includes(st) && rider ? iso(t.assigned) : null,
      out_for_delivery_at: ["out_for_delivery", "delivered", "failed"].includes(st) ? iso(t.out) : null,
      delivered_at: t.delivered ? iso(t.delivered) : null,
      failed_reason: o.failedReason ?? null,
      late_flagged_at: o.late || (["paid", "packed", "assigned", "out_for_delivery"].includes(st) && promised < NOW) ? iso(Math.min(NOW, promised + H1)) : null,
      delivery_rating: o.rating ?? null,
      delivery_feedback: o.feedback ?? null,
      created_at: iso(paidAt - 6 * 60_000),
    });

    itemsFor.push(o.items.map(([slug, q]) => ({ product_id: P[slug].id, slug, name: P[slug].name, unit_price_kobo: P[slug].price_kobo, qty: q })));

    const ev = [];
    const push = (to, at, from) => ev.push({ kind: "status", from_status: from, to_status: to, created_at: iso(at) });
    if (st !== "pending_payment") push("paid", paidAt, "pending_payment");
    if (st === "cancelled") push("cancelled", paidAt + 3 * H1, "paid");
    if (reached("packed") && st !== "cancelled" && st !== "paid") push("packed", t.packed, "paid");
    if (["assigned", "out_for_delivery", "delivered", "failed"].includes(st) && rider) push("assigned", t.assigned, "packed");
    if (["out_for_delivery", "delivered", "failed"].includes(st)) push("out_for_delivery", t.out, rider ? "assigned" : "packed");
    if (st === "delivered") push("delivered", t.delivered, "out_for_delivery");
    if (st === "failed") {
      push("failed", t.out + 2 * H1, "out_for_delivery");
      ev.push({ kind: "note", message: o.failedReason, created_at: iso(t.out + 2 * H1) });
    }
    if (o.late) ev.push({ kind: "late", message: "Passed its promised delivery time", created_at: iso(promised + H1) });
    eventsFor.push(ev);
  });

  const inserted = await rest("POST", "orders", orderRows);
  const idByRef = Object.fromEntries(inserted.map((o) => [o.ref, o.id]));

  await rest(
    "POST",
    "order_items",
    itemsFor.flatMap((items, i) => items.map((it) => ({ ...it, order_id: idByRef[ref(i)] }))),
    "return=minimal",
  );
  await rest(
    "POST",
    "order_events",
    eventsFor.flatMap((ev, i) => ev.map((e) => ({ ...e, order_id: idByRef[ref(i)] }))),
    "return=minimal",
  );

  // riders on the road right now (Emeka near Lekki, Musa on the mainland, Tunde last seen a while ago)
  await rest(
    "POST",
    "rider_locations",
    [
      { rider_id: riders[1].id, lat: 6.4408, lng: 3.4641, heading: 80, speed: 6.5, updated_at: iso(NOW - 60_000) },
      { rider_id: riders[2].id, lat: 6.5409, lng: 3.3792, heading: 190, speed: 5.2, updated_at: iso(NOW - 3 * 60_000) },
      { rider_id: riders[0].id, lat: 6.4549, lng: 3.4246, heading: 0, speed: 0, updated_at: iso(NOW - 45 * 60_000) },
    ],
    "return=minimal",
  );

  // complaints: three to handle, two already resolved
  const oid = (i) => idByRef[ref(i)];
  const cid = (c) => custByEmail[CUSTOMERS[c].email];
  await rest(
    "POST",
    "complaints",
    [
      { order_id: oid(14), customer_id: cid(13), category: "late", body: "It’s been over a day and I haven’t heard anything. Is my order still coming?", status: "open", created_at: iso(NOW - 2 * H1) },
      { order_id: oid(9), customer_id: cid(8), rider_id: riders[2].id, category: "damaged", body: "One of the three bottles had a cracked dropper cap and some oil leaked into the bag.", status: "open", created_at: iso(NOW - 20 * H1) },
      { order_id: oid(10), customer_id: cid(0), rider_id: riders[1].id, category: "skin_reaction", body: "My scalp felt itchy after the second use. Should I stop? I did a patch test first.", status: "in_progress", created_at: iso(NOW - 8 * H1) },
      { order_id: oid(3), customer_id: cid(3), rider_id: riders[2].id, category: "late", body: "Delivery came the next evening instead of the morning.", status: "resolved", resolution: "store_credit", resolution_note: "Apologised on WhatsApp, ₦2,500 credit for next order", amount_kobo: 250000, created_at: iso(NOW - 230 * H1), resolved_at: iso(NOW - 228 * H1) },
      { order_id: oid(2), customer_id: cid(2), category: "wrong_item", body: "I ordered two Nettle but got one Rosemary.", status: "resolved", resolution: "replacement", resolution_note: "Sent the correct bottle the next day, she kept the Rosemary", created_at: iso(NOW - 260 * H1), resolved_at: iso(NOW - 250 * H1) },
    ],
    "return=minimal",
  );

  // abandoned bags (cart-reminder emails would skip these demo addresses)
  await rest(
    "POST",
    "checkout_sessions",
    [
      { email: `grace.adebayo@${DOMAIN}`, full_name: "Grace Adebayo", lines: [{ slug: RL, name: P[RL].name, qty: 1, priceKobo: P[RL].price_kobo }], subtotal_kobo: P[RL].price_kobo, status: "open", reminders_sent: 0 },
      { email: `ola.james@${DOMAIN}`, full_name: "Ola James", lines: [{ slug: NPS, name: P[NPS].name, qty: 2, priceKobo: P[NPS].price_kobo }], subtotal_kobo: P[NPS].price_kobo * 2, status: "open", reminders_sent: 1, last_reminder_at: iso(NOW - 20 * H1) },
      { email: `dami.oke@${DOMAIN}`, full_name: "Dami Oke", lines: [{ slug: RL, name: P[RL].name, qty: 1, priceKobo: P[RL].price_kobo }, { slug: NPS, name: P[NPS].name, qty: 1, priceKobo: P[NPS].price_kobo }], subtotal_kobo: P[RL].price_kobo + P[NPS].price_kobo, status: "open", reminders_sent: 2, last_reminder_at: iso(NOW - 30 * H1) },
    ],
    "return=minimal",
  );

  // newsletter: 16 subscribed, 2 unsubscribed
  const first = ["Ada", "Bola", "Chidi", "Dupe", "Ebere", "Fola", "Gozie", "Hauwa", "Ije", "Jide", "Kachi", "Lara", "Mide", "Ngozi", "Ore", "Pelumi", "Rita", "Sade"];
  await rest(
    "POST",
    "newsletter_subscribers",
    first.map((n, i) => ({
      email: `${n.toLowerCase()}${i}@${DOMAIN}`,
      source: ["footer", "checkout", "footer", "ritual"][i % 4],
      status: i >= 16 ? "unsubscribed" : "subscribed",
      consent_at: iso(NOW - (i + 1) * 20 * H1),
      created_at: iso(NOW - (i + 1) * 20 * H1),
      unsubscribed_at: i >= 16 ? iso(NOW - 5 * H1) : null,
    })),
    "return=minimal",
  );

  console.log(`Seeded ${orderRows.length} orders (${ORDERS.filter((o) => o.status === "delivered").length} delivered, the rest in every live stage), ${riders.length} riders, ${customers.length} customers, 5 complaints, 3 abandoned bags, ${first.length} subscribers.`);
}

const mode = process.argv[2];
if (mode === "seed") await seed();
else if (mode === "clear") await clear();
else if (mode === "status") await status();
else console.log("Usage: node scripts/demo-data.mjs seed | clear | status");
