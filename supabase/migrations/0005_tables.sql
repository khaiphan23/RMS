-- [store-data] tables: điểm đặt món (bàn). QR chung của quán dùng một dòng table_code cố định 'chung'.

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  table_code text not null,
  name text not null,
  seats integer check (seats > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, table_code),
  unique (id, store_id)
);

create index if not exists tables_store_id_idx on public.tables (store_id);

alter table public.tables enable row level security;
alter table public.tables force row level security;

grant select, insert, update, delete on public.tables to authenticated;
grant select, insert, update, delete on public.tables to service_role;
