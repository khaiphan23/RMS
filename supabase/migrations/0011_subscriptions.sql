-- [platform-data] subscriptions: quán thuê gói nào, đến khi nào.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > started_at)
);

create index if not exists subscriptions_store_id_idx on public.subscriptions (store_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
