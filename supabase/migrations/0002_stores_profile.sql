-- [store-data] stores_profile: hồ sơ/cấu hình riêng của quán. FK tới store_registry (0001) nên 0001 phải chạy trước.

create table if not exists public.stores_profile (
  store_id uuid primary key references public.store_registry (id) on delete cascade,
  address text,
  phone text,
  logo_url text,
  opening_hours jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stores_profile enable row level security;
alter table public.stores_profile force row level security;

grant select, insert, update, delete on public.stores_profile to authenticated;
grant select, insert, update, delete on public.stores_profile to service_role;
