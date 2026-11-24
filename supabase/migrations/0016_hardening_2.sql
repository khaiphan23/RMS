-- 0016: hardening lần 2. Chạy sau 0015; KHÔNG sửa 0001-0015.
-- 1) Chặn sửa total_vnd/store_id/order_token/created_at trên orders (trừ service_role/postgres).
-- 2) payments không bị xoá theo đơn: FK RESTRICT; chỉ service_role xoá được payments.
-- 3) Chuẩn hoá search_path cho các hàm SECURITY DEFINER (và hàm được gọi từ chúng).

-- ===== 1. Hàm SECURITY DEFINER: search_path rỗng + tham chiếu đầy đủ schema =====

create or replace function public.is_store_member(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.store_id = p_store_id
      and sm.user_id = auth.uid()
      and sm.active
  );
$$;

-- Không phải SECURITY DEFINER, nhưng được gọi từ hàm definer nên pin luôn search_path.
create or replace function public.current_order_token()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(pg_catalog.current_setting('request.headers', true), '')::jsonb ->> 'x-order-token';
$$;

create or replace function public.is_valid_order_target(p_store_id uuid, p_table_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tables t
    join public.store_registry sr on sr.id = t.store_id
    where t.id = p_table_id
      and t.store_id = p_store_id
      and t.active
      and sr.status = 'active'
  );
$$;

create or replace function public.is_valid_new_order_item(
  p_order_id uuid,
  p_store_id uuid,
  p_menu_item_id uuid,
  p_unit_price_vnd bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.menu_items mi on mi.id = p_menu_item_id
    where o.id = p_order_id
      and o.store_id = p_store_id
      and o.order_status = 'pending'
      and o.order_token::text = coalesce(public.current_order_token(), '')
      and mi.store_id = p_store_id
      and mi.available
      and mi.price_vnd = p_unit_price_vnd
  );
$$;

-- Không cần SECURITY DEFINER (chỉ đọc JWT); pin search_path theo yêu cầu hardening.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'platform_admin';
$$;

create or replace function public.store_role(p_store_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sm.role::text
  from public.staff_members sm
  where sm.store_id = p_store_id
    and sm.user_id = auth.uid()
    and sm.active
  limit 1;
$$;

create or replace function public.has_store_role(p_store_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.store_id = p_store_id
      and sm.user_id = auth.uid()
      and sm.active
      and sm.role::text = any (p_roles)
  );
$$;

create or replace function public.sync_order_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  if tg_op = 'DELETE' then
    v_order_id := old.order_id;
  else
    v_order_id := new.order_id;
  end if;

  update public.orders o
     set total_vnd = coalesce((
       select sum(oi.line_total_vnd)
       from public.order_items oi
       where oi.order_id = v_order_id
     ), 0)::bigint
   where o.id = v_order_id;

  -- Item chuyển sang đơn khác: tính lại cả đơn cũ.
  if tg_op = 'UPDATE' and old.order_id is distinct from new.order_id then
    update public.orders o
       set total_vnd = coalesce((
         select sum(oi.line_total_vnd)
         from public.order_items oi
         where oi.order_id = old.order_id
       ), 0)::bigint
     where o.id = old.order_id;
  end if;

  return null;
end $$;

create or replace function public.enforce_kitchen_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- service_role/postgres là server tin cậy; cũng để trigger tổng (definer postgres) đi qua.
  if current_user::text in ('postgres', 'service_role') then
    return new;
  end if;

  if public.store_role(old.store_id) = 'kitchen'
     and (to_jsonb(new) - 'order_status') is distinct from (to_jsonb(old) - 'order_status') then
    raise exception 'kitchen chỉ được cập nhật order_status' using errcode = '42501';
  end if;
  return new;
end $$;

-- ===== 2. orders: cột định danh/tổng tiền bất biến với client =====
-- total_vnd chỉ được đổi bởi public.sync_order_total().
-- Hàm đó là SECURITY DEFINER (owner postgres) nên khi nó UPDATE orders thì
-- current_user = postgres và guard cho qua. User thường không thể mạo danh
-- postgres/service_role. Nếu đổi owner của sync_order_total, phải thêm role đó vào đây.
create or replace function public.guard_order_immutable_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user::text in ('postgres', 'service_role') then
    return new;
  end if;

  if new.total_vnd is distinct from old.total_vnd
     or new.store_id is distinct from old.store_id
     or new.order_token is distinct from old.order_token
     or new.created_at is distinct from old.created_at then
    raise exception 'không được sửa total_vnd/store_id/order_token/created_at'
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists orders_immutable_columns_guard on public.orders;
create trigger orders_immutable_columns_guard
  before update on public.orders
  for each row execute function public.guard_order_immutable_columns();

-- ===== 3. payments: không mất theo đơn; chỉ service_role xoá =====
-- Đổi FK (order_id, store_id) từ ON DELETE CASCADE sang RESTRICT.
alter table public.payments
  drop constraint payments_order_id_store_id_fkey,
  add constraint payments_order_id_store_id_fkey
    foreign key (order_id, store_id) references public.orders (id, store_id)
    on delete restrict;

-- 0015 không tạo policy DELETE cho payments; revoke thêm ở tầng grant cho chắc.
revoke delete on public.payments from authenticated;
