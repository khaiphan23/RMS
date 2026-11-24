-- [platform-data] subscription_invoices: phí quán trả nền tảng, platform admin xem.

create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  amount_vnd bigint not null check (amount_vnd >= 0),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'void')),
  issued_at timestamptz,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists subscription_invoices_store_id_idx on public.subscription_invoices (store_id);
create index if not exists subscription_invoices_subscription_id_idx on public.subscription_invoices (subscription_id);

alter table public.subscription_invoices enable row level security;
alter table public.subscription_invoices force row level security;

grant select on public.subscription_invoices to authenticated;
grant select, insert, update, delete on public.subscription_invoices to service_role;
