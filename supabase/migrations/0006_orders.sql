-- [store-data] orders: đơn hàng. order_token là bearer token cho khách không tài khoản.
-- shortcut: total_vnd do client/API gửi, chưa có trigger đối soát từ order_items; nâng cấp khi mở đặt món ẩn danh thật.

do $$
begin
  create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  table_id uuid not null,
  order_token uuid not null default gen_random_uuid(),
  order_status public.order_status not null default 'pending',
  total_vnd bigint not null default 0 check (total_vnd >= 0),
  note text,
  customer_name text,
  customer_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_token),
  unique (id, store_id),
  foreign key (table_id, store_id) references public.tables (id, store_id)
);

create index if not exists orders_store_id_idx on public.orders (store_id);
create index if not exists orders_table_id_idx on public.orders (table_id);

alter table public.orders enable row level security;
alter table public.orders force row level security;

grant select, insert, update, delete on public.orders to authenticated;
grant insert on public.orders to anon;
grant select, insert, update, delete on public.orders to service_role;
