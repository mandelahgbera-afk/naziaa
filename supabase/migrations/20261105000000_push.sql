-- Phone notifications for the Studio (Web Push). One row per phone or browser that said yes.
-- Each staff member sees and manages only their own rows; the server (service role) reads them all to send.
-- Safe to run more than once.
create table if not exists public.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  kinds text[] not null default '{order,complaint,delivery,stock}',
  device text check (device is null or length(device) <= 80),
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

drop policy if exists "own phones" on public.push_subscriptions;
create policy "own phones" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid() and public.is_staff());
