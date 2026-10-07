-- ════════════════════════════════════════════════════════════════════════════
--  Performance: indexes for the queries the site actually runs, plus security
--  rules rewritten so Postgres evaluates the role check ONCE per query instead
--  of once per row (Supabase's recommended `(select fn())` pattern).
--  Safe to run once on top of the init + stock migrations.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Indexes ────────────────────────────────────────────────────────────────
-- order lookups by email (track page, cart-reminder "did they buy?" check)
create index if not exists orders_email_idx on public.orders (email, created_at desc);
-- late-order job + "running late" dashboard tile: only active orders
create index if not exists orders_active_promised_idx on public.orders (promised_by)
  where status in ('paid', 'packed', 'assigned', 'out_for_delivery');
-- revenue charts
create index if not exists orders_paid_at_idx on public.orders (paid_at desc) where paid_at is not null;
-- delivery-rating average
create index if not exists orders_rated_idx on public.orders (delivered_at desc) where delivery_rating is not null;
-- foreign keys Postgres does not index on its own
create index if not exists orders_zone_idx on public.orders (zone_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists order_items_batch_idx on public.order_items (batch_id);
create index if not exists riders_zone_idx on public.riders (zone_id);
create index if not exists delivery_proofs_order_idx on public.delivery_proofs (order_id);
create index if not exists delivery_proofs_rider_idx on public.delivery_proofs (rider_id);
create index if not exists complaints_order_idx on public.complaints (order_id);
create index if not exists complaints_customer_idx on public.complaints (customer_id);
create index if not exists complaints_rider_idx on public.complaints (rider_id, created_at desc);
create index if not exists checkout_sessions_order_idx on public.checkout_sessions (order_id);
-- open complaints badge + list
create index if not exists complaints_open_idx on public.complaints (created_at desc) where status <> 'resolved';
-- abandoned-bag job
create index if not exists checkout_sessions_open_idx on public.checkout_sessions (updated_at) where status = 'open';
-- newsletter sends + counts
create index if not exists newsletter_status_idx on public.newsletter_subscribers (status, created_at desc);
-- the live hero lookup on every homepage render
create index if not exists hero_live_idx on public.hero_videos (priority desc, created_at desc) where is_active and status = 'ready';
-- campaign history
create index if not exists audit_action_idx on public.audit_log (action, created_at desc);

-- ─── Faster security rules ──────────────────────────────────────────────────
-- Same rules as before; wrapping the function calls in (select …) lets Postgres
-- cache the answer for the whole query instead of re-running it per row.

drop policy if exists "own profile" on public.profiles;
drop policy if exists "staff manage profiles" on public.profiles;
create policy "own profile" on public.profiles for select using (id = (select auth.uid()) or (select public.is_staff()));
create policy "staff manage profiles" on public.profiles for update using ((select public.current_role_is(array['owner']::public.app_role[])));

drop policy if exists "read active products" on public.products;
drop policy if exists "staff write products" on public.products;
create policy "read active products" on public.products for select using (status = 'active' or (select public.is_staff()));
create policy "staff write products" on public.products for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "staff write batches" on public.batches;
create policy "staff write batches" on public.batches for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "read live hero" on public.hero_videos;
drop policy if exists "staff write hero" on public.hero_videos;
create policy "read live hero" on public.hero_videos for select using ((is_active and status = 'ready') or (select public.is_staff()));
create policy "staff write hero" on public.hero_videos for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "read public settings" on public.site_settings;
drop policy if exists "staff write settings" on public.site_settings;
create policy "read public settings" on public.site_settings for select using (is_public or (select public.is_staff()));
create policy "staff write settings" on public.site_settings for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "read zones" on public.delivery_zones;
drop policy if exists "staff write zones" on public.delivery_zones;
create policy "read zones" on public.delivery_zones for select using (is_active or (select public.is_staff()));
create policy "staff write zones" on public.delivery_zones for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "staff manage riders" on public.riders;
drop policy if exists "rider reads self" on public.riders;
create policy "staff manage riders" on public.riders for all using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "rider reads self" on public.riders for select using (profile_id = (select auth.uid()));

drop policy if exists "staff read locations" on public.rider_locations;
drop policy if exists "rider writes own location" on public.rider_locations;
drop policy if exists "rider updates own location" on public.rider_locations;
create policy "staff read locations" on public.rider_locations for select using ((select public.is_staff()) or rider_id = (select public.current_rider_id()));
create policy "rider writes own location" on public.rider_locations for insert with check (rider_id = (select public.current_rider_id()));
create policy "rider updates own location" on public.rider_locations for update using (rider_id = (select public.current_rider_id()));

drop policy if exists "staff customers" on public.customers;
drop policy if exists "customer self" on public.customers;
create policy "staff customers" on public.customers for all using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "customer self" on public.customers for select using (user_id = (select auth.uid()));

drop policy if exists "staff orders" on public.orders;
drop policy if exists "customer own orders" on public.orders;
drop policy if exists "rider assigned orders" on public.orders;
create policy "staff orders" on public.orders for all using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "customer own orders" on public.orders for select using (customer_id in (select id from public.customers where user_id = (select auth.uid())));
create policy "rider assigned orders" on public.orders for select using (rider_id is not null and rider_id = (select public.current_rider_id()));

drop policy if exists "staff items" on public.order_items;
create policy "staff items" on public.order_items for all using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "staff events" on public.order_events;
create policy "staff events" on public.order_events for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "staff proofs" on public.delivery_proofs;
drop policy if exists "rider adds proof" on public.delivery_proofs;
create policy "staff proofs" on public.delivery_proofs for all using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "rider adds proof" on public.delivery_proofs for insert with check (rider_id = (select public.current_rider_id()));

drop policy if exists "staff complaints" on public.complaints;
create policy "staff complaints" on public.complaints for all using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "staff newsletter" on public.newsletter_subscribers;
create policy "staff newsletter" on public.newsletter_subscribers for all using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "staff checkouts" on public.checkout_sessions;
create policy "staff checkouts" on public.checkout_sessions for select using ((select public.is_staff()));
drop policy if exists "staff audit" on public.audit_log;
create policy "staff audit" on public.audit_log for select using ((select public.is_staff()));

drop policy if exists "staff media write" on storage.objects;
drop policy if exists "staff media update" on storage.objects;
drop policy if exists "staff media delete" on storage.objects;
drop policy if exists "riders upload proofs" on storage.objects;
drop policy if exists "staff read proofs" on storage.objects;
create policy "staff media write" on storage.objects for insert with check (bucket_id = 'media' and (select public.is_staff()));
create policy "staff media update" on storage.objects for update using (bucket_id = 'media' and (select public.is_staff()));
create policy "staff media delete" on storage.objects for delete using (bucket_id = 'media' and (select public.is_staff()));
create policy "riders upload proofs" on storage.objects for insert with check (bucket_id = 'delivery-proofs' and ((select public.current_rider_id()) is not null or (select public.is_staff())));
create policy "staff read proofs" on storage.objects for select using (bucket_id = 'delivery-proofs' and (select public.is_staff()));

-- refresh planner statistics so the new indexes are used straight away
analyze public.orders;
analyze public.order_items;
analyze public.checkout_sessions;
analyze public.complaints;
