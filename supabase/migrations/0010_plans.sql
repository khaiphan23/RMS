-- [platform-data] plans: gói thuê dịch vụ nền tảng. Tiền bigint VND.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  setup_fee_vnd bigint not null default 0 check (setup_fee_vnd >= 0),
  monthly_fee_vnd bigint not null default 0 check (monthly_fee_vnd >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.plans force row level security;

grant select on public.plans to authenticated;
grant select, insert, update, delete on public.plans to service_role;
