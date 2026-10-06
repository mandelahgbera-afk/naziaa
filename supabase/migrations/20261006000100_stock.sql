-- Stock is drawn from the oldest batch first (first in, first out) when an order is paid.
-- Products with track_inventory = false are skipped.
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
       order by infused_on asc
       for update
    loop
      exit when need = 0;
      take := least(need, b.qty_available);
      update public.batches set qty_available = qty_available - take where id = b.id;
      update public.order_items set batch_id = coalesce(batch_id, b.id) where id = it.id;
      need := need - take;
    end loop;
    if need > 0 then
      insert into public.order_events (order_id, kind, message)
      values (p_order, 'stock', format('Short by %s unit(s) for product %s — restock needed', need, it.product_id));
    end if;
  end loop;
end $$;

revoke execute on function public.allocate_stock(uuid) from public, anon, authenticated;
