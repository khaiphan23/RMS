-- RLS nhóm store-data — bản chính, db push chạy file này (bản tham chiếu: supabase/policies/store-isolation.sql).
-- Chạy sau 0012; không phụ thuộc 0014.
-- Quy ước:
--   * Thành viên quán: staff_members.user_id = auth.uid(); MVP không phân biệt owner/manager/cashier/waiter/kitchen.
--   * Khách: bearer token order_token gửi qua header PostgREST 'x-order-token'.
--   * anon chỉ có SELECT menu_categories/menu_items và INSERT orders/order_items (grant ở 0003/0004/0006/0007).

-- ===== helpers =====

-- SECURITY DEFINER để tránh đệ quy RLS khi policy của staff_members gọi lại chính nó.
create or replace function public.is_store_member(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.store_id = p_store_id
      and sm.user_id = auth.uid()
      and sm.active
  );
$$;

-- Token phiên khách do client sinh và gửi kèm header; ai có token xem được đơn đó.
create or replace function public.current_order_token()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-order-token';
$$;

-- SECURITY DEFINER: anon không có SELECT trên tables/store_registry nhưng vẫn cần validate khi tạo đơn.
create or replace function public.is_valid_order_target(p_store_id uuid, p_table_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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

-- SECURITY DEFINER: kiểm tra đơn pending đúng phiên và giá khớp menu hiện tại.
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
set search_path = public
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

grant execute on function public.is_store_member(uuid) to authenticated, service_role;
grant execute on function public.current_order_token() to anon, authenticated, service_role;
grant execute on function public.is_valid_order_target(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.is_valid_new_order_item(uuid, uuid, uuid, bigint) to anon, authenticated, service_role;

-- ===== store_registry: thành viên chỉ đọc quán mình (platform admin xử lý ở 0014) =====
drop policy if exists store_registry_member_read on public.store_registry;
create policy store_registry_member_read on public.store_registry
  for select to authenticated
  using (public.is_store_member(id));

-- ===== stores_profile =====
drop policy if exists stores_profile_member_all on public.stores_profile;
create policy stores_profile_member_all on public.stores_profile
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ===== menu_categories =====
drop policy if exists menu_categories_member_all on public.menu_categories;
create policy menu_categories_member_all on public.menu_categories
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

drop policy if exists menu_categories_public_read on public.menu_categories;
create policy menu_categories_public_read on public.menu_categories
  for select to anon
  using (active);

-- ===== menu_items =====
drop policy if exists menu_items_member_all on public.menu_items;
create policy menu_items_member_all on public.menu_items
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items
  for select to anon
  using (available);

-- ===== tables =====
drop policy if exists tables_member_all on public.tables;
create policy tables_member_all on public.tables
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ===== orders =====
drop policy if exists orders_member_all on public.orders;
create policy orders_member_all on public.orders
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- Khách tạo đơn: token khớp header + bàn active thuộc đúng quán đang active.
-- Quan hệ store/table đã được composite FK (table_id, store_id) bảo đảm.
drop policy if exists orders_customer_insert on public.orders;
create policy orders_customer_insert on public.orders
  for insert to anon
  with check (
    order_token::text = coalesce(public.current_order_token(), '')
    and public.is_valid_order_target(store_id, table_id)
  );

-- ===== order_items =====
drop policy if exists order_items_member_all on public.order_items;
create policy order_items_member_all on public.order_items
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

drop policy if exists order_items_customer_insert on public.order_items;
create policy order_items_customer_insert on public.order_items
  for insert to anon
  with check (
    public.is_valid_new_order_item(order_id, store_id, menu_item_id, unit_price_vnd)
  );

-- ===== payments =====
drop policy if exists payments_member_all on public.payments;
create policy payments_member_all on public.payments
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ===== staff_members =====
drop policy if exists staff_members_member_all on public.staff_members;
create policy staff_members_member_all on public.staff_members
  for all to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));
