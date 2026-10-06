-- ════════════════════════════════════════════════════════════════════════════
--  Nazia Botanics — initial schema
--  Storefront, batches, hero video, orders + delivery state machine, riders,
--  complaints, newsletter, abandoned checkouts, audit log. RLS on everything.
--  Run once in Supabase → SQL Editor (or `supabase db push`).
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.app_role as enum ('customer', 'staff', 'owner', 'rider');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum (
  'pending_payment', 'paid', 'packed', 'assigned', 'out_for_delivery',
  'delivered', 'failed', 'returned', 'cancelled', 'refunded'
);
create type public.complaint_category as enum ('late', 'damaged', 'wrong_item', 'skin_reaction', 'missing', 'other');
create type public.complaint_status as enum ('open', 'in_progress', 'resolved');
create type public.complaint_resolution as enum ('refund', 'replacement', 'store_credit', 'none');

-- ─── Helpers ────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── Profiles & roles ───────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role_is(roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = any (roles));
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_is(array['staff', 'owner']::public.app_role[]);
$$;

-- ─── Catalogue ──────────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  subtitle text not null default '',
  tagline text,
  description text not null default '',
  price_kobo integer not null check (price_kobo >= 0),
  size_ml integer not null default 50 check (size_ml > 0),
  cutout_url text not null default '',
  square_url text not null default '',
  tint_top text not null default '#f4e8dc',
  tint_bottom text not null default '#e6c9b0',
  accent text not null default '#9a4d16',
  benefits jsonb not null default '[]'::jsonb,
  how_to_use jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  status public.product_status not null default 'draft',
  sort integer not null default 0,
  -- when false the product is always purchasable; when true stock comes from batches
  track_inventory boolean not null default false,
  low_stock_threshold integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  code text not null,
  infused_on date not null,
  expires_on date,
  qty_produced integer not null check (qty_produced >= 0),
  qty_available integer not null check (qty_available >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (product_id, code)
);
create index batches_product_idx on public.batches (product_id, infused_on desc);

create view public.storefront_products with (security_invoker = true) as
select
  p.id, p.slug, p.name, p.subtitle, p.tagline, p.description, p.price_kobo, p.size_ml,
  p.cutout_url, p.square_url, p.tint_top, p.tint_bottom, p.accent,
  p.benefits, p.how_to_use, p.notes, p.sort,
  case when p.track_inventory
    then (select coalesce(sum(b.qty_available), 0) from public.batches b where b.product_id = p.id)
    else null end as stock_available,
  (select jsonb_build_object('code', b.code, 'infused_on', b.infused_on)
     from public.batches b
    where b.product_id = p.id and b.qty_available > 0
    order by b.infused_on desc limit 1) as current_batch
from public.products p
where p.status = 'active';

-- ─── Hero video (Mux) ───────────────────────────────────────────────────────
create table public.hero_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Hero video',
  mux_upload_id text,
  mux_asset_id text,
  playback_id text,
  mobile_playback_id text,
  poster_url text,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'errored')),
  tint numeric(3, 2) not null default 0.35 check (tint between 0 and 0.9),
  focal_x numeric(3, 2) not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric(3, 2) not null default 0.5 check (focal_y between 0 and 1),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  priority integer not null default 0,
  created_at timestamptz not null default now()
);

create view public.live_hero_video with (security_invoker = true) as
select playback_id, mobile_playback_id, poster_url, tint, focal_x, focal_y
from public.hero_videos
where is_active and status = 'ready' and playback_id is not null
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
order by priority desc, created_at desc
limit 1;

-- ─── Settings ───────────────────────────────────────────────────────────────
create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

-- ─── Delivery ───────────────────────────────────────────────────────────────
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  fee_kobo integer not null default 0 check (fee_kobo >= 0),
  eta_min_hours integer not null default 24,
  eta_max_hours integer not null default 48,
  uses_courier boolean not null default false,
  is_active boolean not null default true,
  sort integer not null default 0
);

create table public.riders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles on delete set null,
  name text not null,
  phone text not null,
  zone_id uuid references public.delivery_zones on delete set null,
  vehicle text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.current_rider_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.riders where profile_id = auth.uid() and is_active limit 1;
$$;

create table public.rider_locations (
  rider_id uuid primary key references public.riders on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading real,
  speed real,
  updated_at timestamptz not null default now()
);

-- ─── Customers ──────────────────────────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null,
  email text not null unique check (email = lower(email)),
  phone text,
  full_name text,
  marketing_opt_in boolean not null default false,
  tags text[] not null default '{}',
  notes text,
  birthday date,
  created_at timestamptz not null default now()
);

-- ─── Orders ─────────────────────────────────────────────────────────────────
create or replace function public.new_order_ref() returns text
language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := 'NZ-';
begin
  for i in 1..6 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end $$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default public.new_order_ref(),
  tracking_token uuid not null default gen_random_uuid(),
  customer_id uuid references public.customers on delete set null,
  email text not null,
  phone text not null,
  full_name text not null,
  status public.order_status not null default 'pending_payment',
  subtotal_kobo integer not null check (subtotal_kobo >= 0),
  delivery_fee_kobo integer not null default 0 check (delivery_fee_kobo >= 0),
  discount_kobo integer not null default 0 check (discount_kobo >= 0),
  total_kobo integer not null check (total_kobo >= 0),
  currency text not null default 'NGN',
  zone_id uuid references public.delivery_zones on delete set null,
  address jsonb not null,
  delivery_window text check (delivery_window in ('morning', 'afternoon', 'evening')),
  promised_by timestamptz,
  gift_wrap boolean not null default false,
  gift_note text,
  payment_provider text not null default 'flutterwave',
  payment_ref text unique,
  provider_tx_id text,
  paid_at timestamptz,
  rider_id uuid references public.riders on delete set null,
  assigned_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  failed_reason text,
  delivery_code text not null default lpad(floor(random() * 1000000)::text, 6, '0'),
  late_flagged_at timestamptz,
  apology_sent_at timestamptz,
  delivery_rating smallint check (delivery_rating between 1 and 5),
  delivery_feedback text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_rider_idx on public.orders (rider_id) where rider_id is not null;
create index orders_customer_idx on public.orders (customer_id);
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  product_id uuid references public.products on delete set null,
  batch_id uuid references public.batches on delete set null,
  slug text not null,
  name text not null,
  unit_price_kobo integer not null check (unit_price_kobo >= 0),
  qty integer not null check (qty between 1 and 50)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders on delete cascade,
  kind text not null,
  from_status public.order_status,
  to_status public.order_status,
  message text,
  actor uuid,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- Every status change is logged and stamps its timestamp column
create or replace function public.on_order_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, kind, from_status, to_status, actor)
    values (new.id, 'status', old.status, new.status, auth.uid());
    case new.status
      when 'paid' then new.paid_at := coalesce(new.paid_at, now());
      when 'assigned' then new.assigned_at := now();
      when 'out_for_delivery' then new.out_for_delivery_at := now();
      when 'delivered' then new.delivered_at := now();
      else null;
    end case;
  end if;
  return new;
end $$;
create trigger orders_status_change before update of status on public.orders
  for each row execute function public.on_order_status_change();

-- Allowed moves between statuses
create or replace function public.order_transition_allowed(from_s public.order_status, to_s public.order_status) returns boolean
language sql immutable as $$
  select (from_s, to_s) in (
    ('pending_payment', 'paid'), ('pending_payment', 'cancelled'),
    ('paid', 'packed'), ('paid', 'cancelled'), ('paid', 'refunded'),
    ('packed', 'assigned'), ('packed', 'cancelled'),
    ('assigned', 'out_for_delivery'), ('assigned', 'packed'),
    ('out_for_delivery', 'delivered'), ('out_for_delivery', 'failed'),
    ('failed', 'assigned'), ('failed', 'returned'),
    ('delivered', 'returned'), ('returned', 'refunded')
  );
$$;

-- Staff move orders; riders may only start, complete (with the customer's code) or fail their own deliveries
create or replace function public.advance_order(p_order uuid, p_to public.order_status, p_note text default null, p_code text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  me_rider uuid := public.current_rider_id();
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  if not public.order_transition_allowed(o.status, p_to) then
    raise exception 'cannot move order from % to %', o.status, p_to;
  end if;

  if not public.is_staff() then
    if me_rider is null or o.rider_id is distinct from me_rider then raise exception 'not allowed'; end if;
    if p_to not in ('out_for_delivery', 'delivered', 'failed') then raise exception 'riders cannot set %', p_to; end if;
    if p_to = 'delivered' and (p_code is null or p_code <> o.delivery_code) then raise exception 'delivery code does not match'; end if;
  end if;

  update public.orders
     set status = p_to,
         failed_reason = case when p_to = 'failed' then p_note else failed_reason end
   where id = p_order
  returning * into o;

  if p_note is not null then
    insert into public.order_events (order_id, kind, message, actor) values (p_order, 'note', p_note, auth.uid());
  end if;
  return o;
end $$;

create table public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  rider_id uuid references public.riders on delete set null,
  photo_path text,
  created_at timestamptz not null default now()
);

-- ─── Complaints ─────────────────────────────────────────────────────────────
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders on delete set null,
  customer_id uuid references public.customers on delete set null,
  rider_id uuid references public.riders on delete set null,
  category public.complaint_category not null,
  body text not null,
  status public.complaint_status not null default 'open',
  resolution public.complaint_resolution,
  resolution_note text,
  amount_kobo integer check (amount_kobo >= 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ─── Marketing ──────────────────────────────────────────────────────────────
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source text,
  consent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Checkout sessions double as abandoned-cart records
create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  full_name text,
  lines jsonb not null default '[]'::jsonb,
  subtotal_kobo integer not null default 0,
  status text not null default 'open' check (status in ('open', 'converted', 'expired')),
  reminders_sent integer not null default 0,
  last_reminder_at timestamptz,
  order_id uuid references public.orders on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger checkout_sessions_touch before update on public.checkout_sessions for each row execute function public.touch_updated_at();

-- ─── Audit ──────────────────────────────────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
--  Row-level security
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.batches enable row level security;
alter table public.hero_videos enable row level security;
alter table public.site_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.riders enable row level security;
alter table public.rider_locations enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.complaints enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "staff manage profiles" on public.profiles for update using (public.current_role_is(array['owner']::public.app_role[]));

-- public storefront reads
create policy "read active products" on public.products for select using (status = 'active' or public.is_staff());
create policy "staff write products" on public.products for all using (public.is_staff()) with check (public.is_staff());
create policy "read batches" on public.batches for select using (true);
create policy "staff write batches" on public.batches for all using (public.is_staff()) with check (public.is_staff());
create policy "read live hero" on public.hero_videos for select using ((is_active and status = 'ready') or public.is_staff());
create policy "staff write hero" on public.hero_videos for all using (public.is_staff()) with check (public.is_staff());
create policy "read public settings" on public.site_settings for select using (is_public or public.is_staff());
create policy "staff write settings" on public.site_settings for all using (public.is_staff()) with check (public.is_staff());
create policy "read zones" on public.delivery_zones for select using (is_active or public.is_staff());
create policy "staff write zones" on public.delivery_zones for all using (public.is_staff()) with check (public.is_staff());

-- riders
create policy "staff manage riders" on public.riders for all using (public.is_staff()) with check (public.is_staff());
create policy "rider reads self" on public.riders for select using (profile_id = auth.uid());
create policy "staff read locations" on public.rider_locations for select using (public.is_staff() or rider_id = public.current_rider_id());
create policy "rider writes own location" on public.rider_locations for insert with check (rider_id = public.current_rider_id());
create policy "rider updates own location" on public.rider_locations for update using (rider_id = public.current_rider_id());

-- customers & orders: staff everything; signed-in customers see their own; riders see assigned orders
create policy "staff customers" on public.customers for all using (public.is_staff()) with check (public.is_staff());
create policy "customer self" on public.customers for select using (user_id = auth.uid());
create policy "staff orders" on public.orders for all using (public.is_staff()) with check (public.is_staff());
create policy "customer own orders" on public.orders for select using (customer_id in (select id from public.customers where user_id = auth.uid()));
create policy "rider assigned orders" on public.orders for select using (rider_id is not null and rider_id = public.current_rider_id());
create policy "staff items" on public.order_items for all using (public.is_staff()) with check (public.is_staff());
create policy "items follow order" on public.order_items for select using (order_id in (select id from public.orders));
create policy "staff events" on public.order_events for all using (public.is_staff()) with check (public.is_staff());
create policy "events follow order" on public.order_events for select using (order_id in (select id from public.orders));
create policy "staff proofs" on public.delivery_proofs for all using (public.is_staff()) with check (public.is_staff());
create policy "rider adds proof" on public.delivery_proofs for insert with check (rider_id = public.current_rider_id());

-- back office only
create policy "staff complaints" on public.complaints for all using (public.is_staff()) with check (public.is_staff());
create policy "staff newsletter" on public.newsletter_subscribers for all using (public.is_staff()) with check (public.is_staff());
create policy "staff checkouts" on public.checkout_sessions for select using (public.is_staff());
create policy "staff audit" on public.audit_log for select using (public.is_staff());

-- realtime for the admin board and rider map
alter publication supabase_realtime add table public.orders, public.rider_locations, public.order_events;

-- ─── Storage buckets ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('delivery-proofs', 'delivery-proofs', false) on conflict do nothing;

create policy "public media read" on storage.objects for select using (bucket_id = 'media');
create policy "staff media write" on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());
create policy "staff media update" on storage.objects for update using (bucket_id = 'media' and public.is_staff());
create policy "staff media delete" on storage.objects for delete using (bucket_id = 'media' and public.is_staff());
create policy "riders upload proofs" on storage.objects for insert with check (bucket_id = 'delivery-proofs' and (public.current_rider_id() is not null or public.is_staff()));
create policy "staff read proofs" on storage.objects for select using (bucket_id = 'delivery-proofs' and public.is_staff());
