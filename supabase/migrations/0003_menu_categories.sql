-- [store-data] menu_categories: nhóm món của quán.

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, store_id)
);

create index if not exists menu_categories_store_id_idx on public.menu_categories (store_id);

alter table public.menu_categories enable row level security;
alter table public.menu_categories force row level security;

grant select, insert, update, delete on public.menu_categories to authenticated;
grant select on public.menu_categories to anon;
grant select, insert, update, delete on public.menu_categories to service_role;
