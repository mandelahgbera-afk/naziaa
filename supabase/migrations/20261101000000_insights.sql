-- Insights: anonymous visits and what happened in them, for the Studio. No IP addresses, no names,
-- nothing typed into forms. Only the server writes here; only staff can read. Kept 90 days.
create table if not exists public.site_sessions (
  id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  path text,
  scroll smallint,
  device text,
  country text,
  city text,
  source text
);
create index if not exists site_sessions_last_seen_idx on public.site_sessions (last_seen desc);

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  kind text not null,
  path text,
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists site_events_created_idx on public.site_events (created_at desc);
create index if not exists site_events_kind_idx on public.site_events (kind, created_at desc);

alter table public.site_sessions enable row level security;
alter table public.site_events enable row level security;
drop policy if exists "staff read sessions" on public.site_sessions;
drop policy if exists "staff read events" on public.site_events;
create policy "staff read sessions" on public.site_sessions for select using ((select public.is_staff()));
create policy "staff read events" on public.site_events for select using ((select public.is_staff()));

-- Security audit: signed-out visitors have no reason to call the order function at all.
revoke execute on function public.advance_order(uuid, public.order_status, text, text) from public, anon;
grant execute on function public.advance_order(uuid, public.order_status, text, text) to authenticated;
