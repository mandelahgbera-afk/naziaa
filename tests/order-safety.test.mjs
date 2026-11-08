// The database rules behind the 8 Nov 2026 audit fixes:
//   fix 1: "paid" only through a payment the provider confirmed; staff write orders only through the state functions
//   fix 2: batches are staff-only, yet the storefront still shows stock and the batch that ships next
// (plus the stock that returns on a cancel, fix 5, which rides on the same functions)

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { NEXT_STATUSES, staffMoves } from "../src/lib/order-status.ts";
import { anon, as, freshDb, rows, serviceRole, signedIn } from "./db.mjs";

const id = (prefix, n) => `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const OWNER = id(0, 1);
const STAFF = id(0, 2);
const RIDER_USER = id(0, 3);
const CUSTOMER = id(0, 4);
const RIDER = id(3, 1);
const ZONE = id(2, 1);
const P_ACTIVE = id(1, 1);
const P_DRAFT = id(1, 2);
const P_UNTRACKED = id(1, 3);

const owner = signedIn(OWNER);
const staff = signedIn(STAFF);
const rider = signedIn(RIDER_USER);
const customer = signedIn(CUSTOMER);

let db;

before(async () => {
  db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${OWNER}', 'owner@test.invalid'), ('${STAFF}', 'staff@test.invalid'),
      ('${RIDER_USER}', 'rider@test.invalid'), ('${CUSTOMER}', 'customer@test.invalid');
    update public.profiles set role = 'owner' where id = '${OWNER}';
    update public.profiles set role = 'staff' where id = '${STAFF}';
    update public.profiles set role = 'rider' where id = '${RIDER_USER}';
    insert into public.riders (id, profile_id, name, phone) values ('${RIDER}', '${RIDER_USER}', 'Test Rider', '+2340000000001');
    insert into public.delivery_zones (id, name, fee_kobo) values ('${ZONE}', 'Test area', 150000);
    insert into public.products (id, slug, name, price_kobo, status, track_inventory) values
      ('${P_ACTIVE}', 'test-oil', 'Test Oil', 1000000, 'active', true),
      ('${P_DRAFT}', 'draft-oil', 'Draft Oil', 900000, 'draft', true),
      ('${P_UNTRACKED}', 'gift-card', 'Gift Card', 500000, 'active', false);
    insert into public.batches (product_id, code, infused_on, qty_produced, qty_available, notes) values
      ('${P_ACTIVE}', 'OLD-01', '2026-09-01', 10, 3, 'supplier and cost notes'),
      ('${P_ACTIVE}', 'NEW-02', '2026-10-15', 20, 20, 'private note'),
      ('${P_DRAFT}', 'DRF-01', '2026-10-01', 5, 5, null);
  `);
});

async function resetStock() {
  await db.exec(`
    update public.batches set qty_available = 3 where code = 'OLD-01';
    update public.batches set qty_available = 20 where code = 'NEW-02';
  `);
}

const stock = async () => Object.fromEntries((await rows(db, "select code, qty_available from public.batches where product_id = $1", [P_ACTIVE])).map((b) => [b.code, b.qty_available]));
const statusOf = async (orderId) => (await rows(db, "select status from public.orders where id = $1", [orderId]))[0].status;

/** A new unpaid order for `qty` bottles of the test oil, as checkout creates it. */
async function pendingOrder(qty = 4) {
  const [o] = await rows(
    db,
    `insert into public.orders (email, phone, full_name, subtotal_kobo, delivery_fee_kobo, total_kobo, zone_id, address)
     values ('buyer@test.invalid', '08000000000', 'Test Buyer', $1, 150000, $2, $3, '{"line1":"1 Test Road"}')
     returning id, ref, total_kobo, delivery_code`,
    [qty * 1000000, qty * 1000000 + 150000, ZONE],
  );
  await rows(db, "insert into public.order_items (order_id, product_id, slug, name, unit_price_kobo, qty) values ($1, $2, 'test-oil', 'Test Oil', 1000000, $3)", [o.id, P_ACTIVE, qty]);
  return o;
}

/** What the server does once Flutterwave has verified the payment. */
const confirmPayment = (o, { tx = `FLW-${o.ref}`, amount = o.total_kobo, currency = "NGN" } = {}) =>
  as(db, serviceRole, "select public.confirm_payment($1, $2, $3, $4) as r", [o.ref, tx, amount, currency]).then(([x]) => x.r);

const move = (who, orderId, to, code = null) => as(db, who, "select (public.advance_order($1, $2::public.order_status, null, $3)).status", [orderId, to, code]);

describe("fix 1: paid only through a confirmed payment", () => {
  test("staff can't write to orders directly, only read them", async () => {
    const o = await pendingOrder();
    await assert.rejects(as(db, staff, "update public.orders set status = 'paid' where id = $1", [o.id]), /permission denied/);
    await assert.rejects(as(db, owner, "update public.orders set total_kobo = 1 where id = $1", [o.id]), /permission denied/);
    await assert.rejects(as(db, staff, "update public.orders set rider_id = $2 where id = $1", [o.id, RIDER]), /permission denied/);
    await assert.rejects(as(db, staff, "delete from public.orders where id = $1", [o.id]), /permission denied/);
    await assert.rejects(
      as(db, staff, "insert into public.orders (email, phone, full_name, subtotal_kobo, total_kobo, address, status) values ('x@test.invalid', '0', 'X', 0, 0, '{}', 'paid')"),
      /permission denied/,
    );
    await assert.rejects(as(db, staff, "update public.order_items set qty = 1 where order_id = $1", [o.id]), /permission denied/);
    const [seen] = await as(db, staff, "select status from public.orders where id = $1", [o.id]);
    assert.equal(seen.status, "pending_payment");
  });

  test("the Studio can't mark an order paid, not even the owner", async () => {
    const o = await pendingOrder();
    await assert.rejects(move(staff, o.id, "paid"), /paid only when the payment provider confirms/);
    await assert.rejects(move(owner, o.id, "paid"), /paid only when the payment provider confirms/);
    await assert.rejects(as(db, staff, "select public.confirm_payment($1, 'FAKE-1', $2, 'NGN')", [o.ref, o.total_kobo]), /permission denied/);
    await assert.rejects(as(db, anon, "select public.confirm_payment($1, 'FAKE-1', $2, 'NGN')", [o.ref, o.total_kobo]), /permission denied/);
    assert.equal(await statusOf(o.id), "pending_payment");
  });

  test("not even the server can change a status outside the state functions", async () => {
    const o = await pendingOrder();
    await assert.rejects(
      as(db, serviceRole, "update public.orders set status = 'paid', provider_tx_id = 'FLW-X' where id = $1", [o.id]),
      /go through advance_order or confirm_payment/,
    );
    assert.equal(await statusOf(o.id), "pending_payment");
  });

  test("a short, wrong-currency or id-less payment leaves the order unpaid", async () => {
    await resetStock();
    const o = await pendingOrder();
    assert.equal(await confirmPayment(o, { amount: o.total_kobo - 1 }), "mismatch");
    assert.equal(await confirmPayment(o, { currency: "USD" }), "mismatch");
    await assert.rejects(confirmPayment(o, { tx: " " }), /needs the provider transaction id/);
    assert.equal(await confirmPayment({ ref: "NZ-NOPE00", total_kobo: 1 }), "unknown");
    assert.equal(await statusOf(o.id), "pending_payment");
    assert.deepEqual(await stock(), { "OLD-01": 3, "NEW-02": 20 });
  });

  test("a confirmed payment marks the order paid once and takes stock, oldest batch first", async () => {
    await resetStock();
    const o = await pendingOrder(4);
    assert.equal(await confirmPayment(o), "paid");
    assert.equal(await confirmPayment(o, { tx: "FLW-SECOND" }), "already");

    const [paid] = await rows(db, "select status, provider_tx_id, paid_at from public.orders where id = $1", [o.id]);
    assert.equal(paid.status, "paid");
    assert.equal(paid.provider_tx_id, `FLW-${o.ref}`);
    assert.ok(paid.paid_at);
    assert.deepEqual(await stock(), { "OLD-01": 0, "NEW-02": 19 });
    const taken = await rows(db, "select b.code, a.qty from public.stock_allocations a join public.batches b on b.id = a.batch_id where a.order_id = $1 order by a.id", [o.id]);
    assert.deepEqual(taken, [{ code: "OLD-01", qty: 3 }, { code: "NEW-02", qty: 1 }]);
  });

  test("staff still move a paid order; cancelling it puts the bottles back", async () => {
    await resetStock();
    const o = await pendingOrder(4);
    await confirmPayment(o);
    assert.deepEqual(await move(staff, o.id, "packed"), [{ status: "packed" }]);
    assert.deepEqual(await move(staff, o.id, "cancelled"), [{ status: "cancelled" }]);
    assert.deepEqual(await stock(), { "OLD-01": 3, "NEW-02": 20 });
    const [ev] = await rows(db, "select message from public.order_events where order_id = $1 and kind = 'stock'", [o.id]);
    assert.equal(ev.message, "4 bottle(s) back in stock");
  });

  test("refunding before packing returns stock too; orders paid before this change use their recorded batch", async () => {
    await resetStock();
    const o = await pendingOrder(2);
    // an order paid under the old rules: one batch on the line, no allocation rows
    await db.transaction(async (tx) => {
      await tx.query("update public.batches set qty_available = 18 where code = 'NEW-02'");
      await tx.query("update public.order_items set batch_id = (select id from public.batches where code = 'NEW-02') where order_id = $1", [o.id]);
      await tx.query("select set_config('nazia.order_move', 'on', true)");
      await tx.query("update public.orders set status = 'paid', provider_tx_id = 'FLW-OLD' where id = $1", [o.id]);
    });
    await move(staff, o.id, "refunded");
    assert.deepEqual(await stock(), { "OLD-01": 3, "NEW-02": 20 });
  });

  test("choosing a rider goes through assign_rider, for staff only", async () => {
    const o = await pendingOrder(1);
    await assert.rejects(as(db, staff, "select public.assign_rider($1, $2)", [o.id, RIDER]), /once the order is packed/);
    await resetStock();
    await confirmPayment(o);
    await move(staff, o.id, "packed");
    await assert.rejects(as(db, rider, "select public.assign_rider($1, $2)", [o.id, RIDER]), /not allowed/);
    await assert.rejects(as(db, customer, "select public.assign_rider($1, $2)", [o.id, RIDER]), /not allowed/);
    await as(db, staff, "select public.assign_rider($1, $2)", [o.id, RIDER]);
    const [row] = await rows(db, "select status, rider_id from public.orders where id = $1", [o.id]);
    assert.deepEqual(row, { status: "assigned", rider_id: RIDER });
  });

  test("riders only start, fail or complete their own deliveries, with the customer's code", async () => {
    await resetStock();
    const o = await pendingOrder(1);
    await confirmPayment(o);
    await assert.rejects(move(rider, o.id, "packed"), /not allowed/); // not their order yet
    await move(staff, o.id, "packed");
    await as(db, staff, "select public.assign_rider($1, $2)", [o.id, RIDER]);
    await assert.rejects(move(rider, o.id, "cancelled"), /cannot move order|riders cannot set/);
    await move(rider, o.id, "out_for_delivery");
    await assert.rejects(move(rider, o.id, "delivered", "000000" === o.delivery_code ? "111111" : "000000"), /code does not match/);
    assert.deepEqual(await move(rider, o.id, "delivered", o.delivery_code), [{ status: "delivered" }]);
  });

  test("the order timeline can't be rewritten: staff add notes only", async () => {
    const o = await pendingOrder(1);
    await as(db, staff, "insert into public.order_events (order_id, kind, message, actor) values ($1, 'note', 'Called the customer', $2)", [o.id, STAFF]);
    await assert.rejects(as(db, staff, "insert into public.order_events (order_id, kind, to_status, actor) values ($1, 'status', 'paid', $2)", [o.id, STAFF]), /row-level security/);
    await assert.rejects(as(db, staff, "insert into public.order_events (order_id, kind, message, actor) values ($1, 'note', 'In someone else''s name', $2)", [o.id, OWNER]), /row-level security/);
    await assert.rejects(as(db, staff, "update public.order_events set message = 'edited' where order_id = $1", [o.id]), /permission denied/);
    await assert.rejects(as(db, staff, "delete from public.order_events where order_id = $1", [o.id]), /permission denied/);
  });

  test("the Studio's move list mirrors the database and never offers paid", async () => {
    const all = (await rows(db, "select unnest(enum_range(null::public.order_status))::text as s")).map((r) => r.s);
    assert.deepEqual(Object.keys(NEXT_STATUSES).sort(), [...all].sort());
    for (const from of all) {
      for (const to of all) {
        const [{ ok }] = await rows(db, "select public.order_transition_allowed($1::public.order_status, $2::public.order_status) as ok", [from, to]);
        assert.equal(NEXT_STATUSES[from].includes(to), ok, `${from} → ${to}`);
      }
      assert.ok(!staffMoves(from).includes("paid"), `the Studio offers paid from ${from}`);
    }
  });
});

describe("fix 2: batches are staff-only", () => {
  test("signed-out visitors can't read the batches table", async () => {
    await assert.rejects(as(db, anon, "select * from public.batches"), /permission denied/);
  });

  test("customers and riders see no batches", async () => {
    assert.equal((await as(db, customer, "select * from public.batches")).length, 0);
    assert.equal((await as(db, rider, "select * from public.batches")).length, 0);
  });

  test("staff still see every batch, notes included", async () => {
    const seen = await as(db, staff, "select code, notes from public.batches order by code");
    assert.deepEqual(seen.map((b) => b.code), ["DRF-01", "NEW-02", "OLD-01"]);
    assert.equal(seen.find((b) => b.code === "OLD-01").notes, "supplier and cost notes");
  });

  test("the storefront still shows stock and names the batch that ships next", async () => {
    await resetStock();
    const shelf = async () =>
      as(db, anon, "select slug, stock_available::int as stock, current_batch ->> 'code' as batch from public.storefront_products order by slug");
    assert.deepEqual(await shelf(), [
      { slug: "gift-card", stock: null, batch: null },
      { slug: "test-oil", stock: 23, batch: "OLD-01" },
    ]);
    await db.exec("update public.batches set qty_available = 0 where code = 'OLD-01'");
    assert.deepEqual((await shelf())[1], { slug: "test-oil", stock: 20, batch: "NEW-02" });
    await resetStock();
  });

  test("a draft product's stock and batch stay hidden from visitors", async () => {
    const [seen] = await as(db, anon, "select public.storefront_stock($1)::int as stock, public.storefront_batch($1) as batch", [P_DRAFT]);
    assert.deepEqual(seen, { stock: null, batch: null });
    const [forStaff] = await as(db, staff, "select public.storefront_stock($1)::int as stock", [P_DRAFT]);
    assert.equal(forStaff.stock, 5);
  });
});
