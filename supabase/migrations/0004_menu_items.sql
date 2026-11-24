-- [store-data] menu_items: món trong menu. Giá lưu bigint VND.

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text,
  price_vnd bigint not null check (price_vnd >= 0),
  image_url text,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, store_id),
  foreign key (category_id, store_id) references public.menu_categories (id, store_id)
);

create index if not exists menu_items_store_id_idx on public.menu_items (store_id);
create index if not exists menu_items_category_id_idx on public.menu_items (category_id);

alter table public.menu_items enable row level security;
alter table public.menu_items force row level security;

grant select, insert, update, delete on public.menu_items to authenticated;
grant select on public.menu_items to anon;
grant select, insert, update, delete on public.menu_items to service_role;
