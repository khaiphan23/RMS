-- [store-data] order_items: dòng món, giữ snapshot tên/giá tại thời điểm đặt.

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  order_id uuid not null,
  menu_item_id uuid not null,
  name_snapshot text not null,
  unit_price_vnd bigint not null check (unit_price_vnd >= 0),
  quantity integer not null check (quantity > 0),
  line_total_vnd bigint generated always as (unit_price_vnd * quantity) stored,
  created_at timestamptz not null default now(),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade,
  foreign key (menu_item_id, store_id) references public.menu_items (id, store_id)
);

create index if not exists order_items_store_id_idx on public.order_items (store_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.order_items enable row level security;
alter table public.order_items force row level security;

grant select, insert, update, delete on public.order_items to authenticated;
grant insert on public.order_items to anon;
grant select, insert, update, delete on public.order_items to service_role;
