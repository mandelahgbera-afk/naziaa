-- ════════════════════════════════════════════════════════════════════════════
--  Order safety (code audit, 8 Nov 2026). Run once after the earlier migrations;
--  safe to run more than once.
--
--  1. "Paid" comes only from a payment the provider confirmed. Staff can read
--     orders but no longer write to them directly: every move goes through
--     advance_order, rider choice through assign_rider, and payment through
--     confirm_payment, which only the server can call, after Flutterwave has
--     verified the transaction. A trigger refuses any other status change.
--  2. Batches (quantities, notes) are staff-only. The storefront still shows
--     stock and the batch that ships next, through two narrow functions.
--  3. Stock taken at payment is recorded per batch and goes back on the shelf
--     when a paid or packed order is cancelled or refunded before it leaves.
--     The product page shows the batch that ships next (the oldest with stock).
--  4. The order timeline can't be edited: staff add notes only.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 3. Stock: record what each order took, batch by batch ──────────────────
create table if not exists public.stock_allocations (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders on delete cascade,
  order_item_id uuid not null references public.order_items on delete cascade,
  batch_id uuid not null references public.batches on delete cascade,
  qty integer not null check (qty > 0),
  returned_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists stock_allocations_order_idx on public.stock_allocations (order_id);
create index if not exists stock_allocations_item_idx on public.stock_allocations (order_item_id);
create index if not exists stock_allocations_batch_idx on public.stock_allocations (batch_id);
alter table public.stock_allocations enable row level security;
revoke insert, update, delete on public.stock_allocations from anon, authenticated;
drop policy if exists "staff read allocations" on public.stock_allocations;
create policy "staff read allocations" on public.stock_allocations for select using ((select public.is_staff()));

-- Oldest batch first; the same order the product page uses to name the batch that ships next.
create or replace function public.allocate_stock(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  it record;
  b record;
  need integer;
  take integer;
begin
  for it in
    select oi.id, oi.product_id, oi.qty
      from public.order_items oi
      join public.products p on p.id = oi.product_id
     where oi.order_id = p_order and p.track_inventory and oi.batch_id is null
  loop
    need := it.qty;
    for b in
      select id, qty_available from public.batches
       where product_id = it.product_id and qty_available > 0
       order by infused_on asc, created_at asc, id asc
       for update
    loop
      exit when need = 0;
      take := least(need, b.qty_available);
      update public.batches set qty_available = qty_available - take where id = b.id;
      update public.order_items set batch_id = coalesce(batch_id, b.id) where id = it.id;
      insert into public.stock_allocations (order_id, order_item_id, batch_id, qty) values (p_order, it.id, b.id, take);
      need := need - take;
    end loop;
    if need > 0 then
      insert into public.order_events (order_id, kind, message)
      values (p_order, 'stock', format('Short by %s unit(s) for product %s — restock needed', need, it.product_id));
    end if;
  end loop;
end $$;
revoke execute on function public.allocate_stock(uuid) from public, anon, authenticated;

-- Puts back what an order took. Never above what the batch produced.
create or replace function public.return_stock(p_order uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  a record;
  room integer;
  give integer;
  back integer := 0;
begin
  for a in
    select sa.id, sa.batch_id, sa.qty from public.stock_allocations sa
     where sa.order_id = p_order and sa.returned_at is null
     order by sa.id
       for update
  loop
    select qty_produced - qty_available into room from public.batches where id = a.batch_id for update;
    give := greatest(0, least(a.qty, coalesce(room, 0)));
    if give > 0 then
      update public.batches set qty_available = qty_available + give where id = a.batch_id;
      back := back + give;
    end if;
    update public.stock_allocations set returned_at = now() where id = a.id;
  end loop;

  -- orders paid before allocations were recorded: one batch per line
  for a in
    select oi.id, oi.batch_id, oi.qty from public.order_items oi
     where oi.order_id = p_order and oi.batch_id is not null
       and not exists (select 1 from public.stock_allocations sa where sa.order_item_id = oi.id)
  loop
    select qty_produced - qty_available into room from public.batches where id = a.batch_id for update;
    give := greatest(0, least(a.qty, coalesce(room, 0)));
    if give > 0 then
      update public.batches set qty_available = qty_available + give where id = a.batch_id;
      back := back + give;
    end if;
    -- record it as returned, so it can never be put back twice
    insert into public.stock_allocations (order_id, order_item_id, batch_id, qty, returned_at)
    values (p_order, a.id, a.batch_id, a.qty, now());
  end loop;

  if back > 0 then
    insert into public.order_events (order_id, kind, message, actor)
    values (p_order, 'stock', format('%s bottle(s) back in stock', back), auth.uid());
  end if;
  return back;
end $$;
revoke execute on function public.return_stock(uuid) from public, anon, authenticated;

-- ─── 1. Order status: one way in ────────────────────────────────────────────
-- A status change is accepted only inside advance_order or confirm_payment,
-- which switch this on for their own transaction. "Paid" needs the provider's
-- transaction id.
create or replace function public.orders_guard() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if coalesce(current_setting('nazia.order_move', true), '') <> 'on' then
      raise exception 'order status changes go through advance_order or confirm_payment';
    end if;
    if new.status = 'paid' and coalesce(new.provider_tx_id, '') = '' then
      raise exception 'an order is paid only when the payment provider confirms it';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before update on public.orders for each row execute function public.orders_guard();

-- Staff move orders; riders may only start, complete (with the customer's code)
-- or fail their own deliveries. Nobody moves an order to "paid" here.
create or replace function public.advance_order(p_order uuid, p_to public.order_status, p_note text default null, p_code text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  from_s public.order_status;
  me_rider uuid := public.current_rider_id();
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  if p_to = 'paid' then
    raise exception 'an order is paid only when the payment provider confirms it';
  end if;
  if not public.order_transition_allowed(o.status, p_to) then
    raise exception 'cannot move order from % to %', o.status, p_to;
  end if;

  if not public.is_staff() then
    if me_rider is null or o.rider_id is distinct from me_rider then raise exception 'not allowed'; end if;
    if p_to not in ('out_for_delivery', 'delivered', 'failed') then raise exception 'riders cannot set %', p_to; end if;
    if p_to = 'delivered' and (p_code is null or p_code <> o.delivery_code) then raise exception 'delivery code does not match'; end if;
  end if;

  from_s := o.status;
  perform set_config('nazia.order_move', 'on', true);
  update public.orders
     set status = p_to,
         failed_reason = case when p_to = 'failed' then p_note else failed_reason end
   where id = p_order
  returning * into o;
  perform set_config('nazia.order_move', '', true);

  -- bottles that never left the shop go back on the shelf
  if p_to in ('cancelled', 'refunded') and from_s in ('paid', 'packed') then
    perform public.return_stock(p_order);
  end if;

  if p_note is not null then
    insert into public.order_events (order_id, kind, message, actor) values (p_order, 'note', p_note, auth.uid());
  end if;
  return o;
end $$;
revoke execute on function public.advance_order(uuid, public.order_status, text, text) from public, anon;
grant execute on function public.advance_order(uuid, public.order_status, text, text) to authenticated;

-- The server calls this only after the provider has verified the transaction.
-- It checks the amount and currency again, flips the order once (the first
-- confirmation wins) and takes the stock. Returns paid | already | mismatch | unknown.
create or replace function public.confirm_payment(p_ref text, p_tx_id text, p_amount_kobo bigint, p_currency text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  if coalesce(trim(p_tx_id), '') = '' then raise exception 'a confirmed payment needs the provider transaction id'; end if;
  select * into o from public.orders where ref = p_ref for update;
  if not found then return 'unknown'; end if;
  if o.status <> 'pending_payment' then return 'already'; end if;
  if p_currency is distinct from o.currency or p_amount_kobo is null or p_amount_kobo < o.total_kobo then
    return 'mismatch';
  end if;

  perform set_config('nazia.order_move', 'on', true);
  update public.orders set status = 'paid', provider_tx_id = p_tx_id, payment_ref = p_ref where id = o.id;
  perform set_config('nazia.order_move', '', true);
  perform public.allocate_stock(o.id);
  return 'paid';
end $$;
revoke execute on function public.confirm_payment(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.confirm_payment(text, text, bigint, text) to service_role;

-- Choosing a rider. A packed (or failed) order moves to "rider assigned".
create or replace function public.assign_rider(p_order uuid, p_rider uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.riders where id = p_rider and is_active) then
    raise exception 'choose an active rider';
  end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  if o.status not in ('packed', 'assigned', 'failed') then
    raise exception 'a rider can be chosen once the order is packed';
  end if;
  update public.orders set rider_id = p_rider where id = p_order;
  if o.status in ('packed', 'failed') then
    return public.advance_order(p_order, 'assigned');
  end if;
  select * into o from public.orders where id = p_order;
  return o;
end $$;
revoke execute on function public.assign_rider(uuid, uuid) from public, anon;
grant execute on function public.assign_rider(uuid, uuid) to authenticated;

-- Staff read orders, items and the timeline; they write through the functions above.
drop policy if exists "staff orders" on public.orders;
drop policy if exists "staff read orders" on public.orders;
create policy "staff read orders" on public.orders for select using ((select public.is_staff()));
revoke insert, update, delete on public.orders from anon, authenticated;

drop policy if exists "staff items" on public.order_items;
drop policy if exists "staff read items" on public.order_items;
create policy "staff read items" on public.order_items for select using ((select public.is_staff()));
revoke insert, update, delete on public.order_items from anon, authenticated;

drop policy if exists "staff events" on public.order_events;
drop policy if exists "staff read events" on public.order_events;
drop policy if exists "staff add notes" on public.order_events;
create policy "staff read events" on public.order_events for select using ((select public.is_staff()));
create policy "staff add notes" on public.order_events for insert
  with check ((select public.is_staff()) and kind = 'note' and actor = (select auth.uid()));
revoke update, delete on public.order_events from anon, authenticated;

-- ─── 2. Batches: staff only ─────────────────────────────────────────────────
-- "staff write batches" (for all) already lets staff read them.
drop policy if exists "read batches" on public.batches;
revoke all on public.batches from anon;

-- What the storefront may know: total stock and the batch that ships next,
-- for products on sale. Nothing else from the batches table.
create or replace function public.storefront_stock(p_product uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select case when p.track_inventory
    then (select coalesce(sum(b.qty_available), 0) from public.batches b where b.product_id = p.id)
    else null end
  from public.products p
  where p.id = p_product and (p.status = 'active' or public.is_staff());
$$;

create or replace function public.storefront_batch(p_product uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', b.code, 'infused_on', b.infused_on)
    from public.batches b
    join public.products p on p.id = b.product_id
   where b.product_id = p_product and b.qty_available > 0
     and (p.status = 'active' or public.is_staff())
   order by b.infused_on asc, b.created_at asc, b.id asc
   limit 1;
$$;
grant execute on function public.storefront_stock(uuid) to anon, authenticated, service_role;
grant execute on function public.storefront_batch(uuid) to anon, authenticated, service_role;

create or replace view public.storefront_products with (security_invoker = true) as
select
  p.id, p.slug, p.name, p.subtitle, p.tagline, p.description, p.price_kobo, p.size_ml,
  p.cutout_url, p.square_url, p.tint_top, p.tint_bottom, p.accent,
  p.benefits, p.how_to_use, p.notes, p.sort,
  public.storefront_stock(p.id) as stock_available,
  public.storefront_batch(p.id) as current_batch
from public.products p
where p.status = 'active';
