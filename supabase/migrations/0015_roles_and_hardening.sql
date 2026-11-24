-- 0015: phân quyền theo staff_members.role + hardening đơn hàng.
-- Chạy sau 0014. KHÔNG sửa 0001-0014 (đã push lên Supabase).
-- 0015 thay thế policy member_all ở 0013 và shortcut total_vnd ở 0006;
-- comment cũ trong 2 file đó coi như hết hiệu lực.
-- Chỉ drop/create policy, thêm helper + trigger; giữ nguyên GRANT bảng.

-- ===== 1. Helpers =====

-- app_metadata chỉ service_role/admin API ghi được; user_metadata thì user tự sửa
-- qua auth.updateUser() nên TUYỆT ĐỐI không dùng để phân quyền.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'platform_admin';
$$;

-- SECURITY DEFINER để đọc staff_members mà không đệ quy RLS.
create or replace function public.store_role(p_store_id uuid)
returns text
language sql
stable
security definer
set search_path = public
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
set search_path = public
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

grant execute on function public.store_role(uuid) to authenticated, service_role;
grant execute on function public.has_store_role(uuid, text[]) to authenticated, service_role;

-- ===== 2. stores_profile: owner SIU, mọi nhân viên S =====
drop policy if exists stores_profile_member_all on public.stores_profile;
drop policy if exists stores_profile_select on public.stores_profile;
drop policy if exists stores_profile_insert_owner on public.stores_profile;
drop policy if exists stores_profile_update_owner on public.stores_profile;

create policy stores_profile_select on public.stores_profile
  for select to authenticated
  using (public.store_role(store_id) is not null);

create policy stores_profile_insert_owner on public.stores_profile
  for insert to authenticated
  with check (public.has_store_role(store_id, array['owner']));

create policy stores_profile_update_owner on public.stores_profile
  for update to authenticated
  using (public.has_store_role(store_id, array['owner']))
  with check (public.has_store_role(store_id, array['owner']));

-- ===== 3. menu_categories / menu_items / tables: owner+manager ghi, mọi nhân viên S =====
drop policy if exists menu_categories_member_all on public.menu_categories;
drop policy if exists menu_categories_select on public.menu_categories;
drop policy if exists menu_categories_write on public.menu_categories;

create policy menu_categories_select on public.menu_categories
  for select to authenticated
  using (public.store_role(store_id) is not null);

create policy menu_categories_write on public.menu_categories
  for all to authenticated
  using (public.has_store_role(store_id, array['owner', 'manager']))
  with check (public.has_store_role(store_id, array['owner', 'manager']));

drop policy if exists menu_items_member_all on public.menu_items;
drop policy if exists menu_items_select on public.menu_items;
drop policy if exists menu_items_write on public.menu_items;

create policy menu_items_select on public.menu_items
  for select to authenticated
  using (public.store_role(store_id) is not null);

create policy menu_items_write on public.menu_items
  for all to authenticated
  using (public.has_store_role(store_id, array['owner', 'manager']))
  with check (public.has_store_role(store_id, array['owner', 'manager']));

drop policy if exists tables_member_all on public.tables;
drop policy if exists tables_select on public.tables;
drop policy if exists tables_write on public.tables;

create policy tables_select on public.tables
  for select to authenticated
  using (public.store_role(store_id) is not null);

create policy tables_write on public.tables
  for all to authenticated
  using (public.has_store_role(store_id, array['owner', 'manager']))
  with check (public.has_store_role(store_id, array['owner', 'manager']));

-- ===== 4. orders: owner/manager/cashier/waiter SIU; kitchen S + UPDATE order_status; DELETE owner =====
drop policy if exists orders_member_all on public.orders;
drop policy if exists orders_select on public.orders;
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_update on public.orders;
drop policy if exists orders_delete_owner on public.orders;

create policy orders_select on public.orders
  for select to authenticated
  using (public.store_role(store_id) is not null);

create policy orders_insert on public.orders
  for insert to authenticated
  with check (public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter']));

create policy orders_update on public.orders
  for update to authenticated
  using (public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter', 'kitchen']))
  with check (public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter', 'kitchen']));

create policy orders_delete_owner on public.orders
  for delete to authenticated
  using (public.has_store_role(store_id, array['owner']));

-- ===== 5. order_items: owner/manager/cashier/waiter SIU; kitchen S; DELETE owner =====
drop policy if exists order_items_member_all on public.order_items;
drop policy if exists order_items_select on public.order_items;
drop policy if exists order_items_insert on public.order_items;
drop policy if exists order_items_update on public.order_items;
drop policy if exists order_items_delete_owner on public.order_items;

create policy order_items_select on public.order_items
  for select to authenticated
  using (public.store_role(store_id) is not null);

create policy order_items_insert on public.order_items
  for insert to authenticated
  with check (public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter']));

create policy order_items_update on public.order_items
  for update to authenticated
  using (public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter']))
  with check (public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter']));

create policy order_items_delete_owner on public.order_items
  for delete to authenticated
  using (public.has_store_role(store_id, array['owner']));

-- ===== 6. payments: owner/manager/cashier SIU; không ai DELETE =====
drop policy if exists payments_member_all on public.payments;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;

create policy payments_select on public.payments
  for select to authenticated
  using (public.has_store_role(store_id, array['owner', 'manager', 'cashier']));

create policy payments_insert on public.payments
  for insert to authenticated
  with check (public.has_store_role(store_id, array['owner', 'manager', 'cashier']));

create policy payments_update on public.payments
  for update to authenticated
  using (public.has_store_role(store_id, array['owner', 'manager', 'cashier']))
  with check (public.has_store_role(store_id, array['owner', 'manager', 'cashier']));

-- ===== 7. staff_members: owner SIUD; manager S; vai trò khác S dòng của mình =====
drop policy if exists staff_members_member_all on public.staff_members;
drop policy if exists staff_members_select on public.staff_members;
drop policy if exists staff_members_insert_owner on public.staff_members;
drop policy if exists staff_members_update_owner on public.staff_members;
drop policy if exists staff_members_delete_owner on public.staff_members;

create policy staff_members_select on public.staff_members
  for select to authenticated
  using (
    public.has_store_role(store_id, array['owner', 'manager'])
    or user_id = auth.uid()
  );

create policy staff_members_insert_owner on public.staff_members
  for insert to authenticated
  with check (public.has_store_role(store_id, array['owner']));

create policy staff_members_update_owner on public.staff_members
  for update to authenticated
  using (public.has_store_role(store_id, array['owner']))
  with check (public.has_store_role(store_id, array['owner']));

create policy staff_members_delete_owner on public.staff_members
  for delete to authenticated
  using (public.has_store_role(store_id, array['owner']));

-- ===== 8. Owner đọc subscription/invoice của quán mình (policy platform ở 0014 giữ nguyên) =====
drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read on public.subscriptions
  for select to authenticated
  using (public.has_store_role(store_id, array['owner']));

drop policy if exists subscription_invoices_owner_read on public.subscription_invoices;
create policy subscription_invoices_owner_read on public.subscription_invoices
  for select to authenticated
  using (public.has_store_role(store_id, array['owner']));

-- ===== 9. total_vnd: client không được đặt, luôn suy ra từ order_items =====
-- Thay thế shortcut "total_vnd do client gửi" ở 0006.
create or replace function public.force_order_total_zero()
returns trigger
language plpgsql
as $$
begin
  new.total_vnd := 0;
  return new;
end $$;

drop trigger if exists orders_force_total_zero on public.orders;
create trigger orders_force_total_zero
  before insert on public.orders
  for each row execute function public.force_order_total_zero();

-- AFTER (không phải BEFORE): BEFORE INSERT không thấy dòng mới trong bảng;
-- phải có DELETE để tổng giảm khi xoá món.
create or replace function public.sync_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists order_items_sync_total on public.order_items;
create trigger order_items_sync_total
  after insert or update or delete on public.order_items
  for each row execute function public.sync_order_total();

-- ===== 10. Kitchen chỉ được đổi order_status =====
-- So sánh toàn bộ cột trừ order_status; nếu sau này thêm trigger updated_at
-- thì phải loại trừ thêm cột đó ở đây.
create or replace function public.enforce_kitchen_order_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.store_role(old.store_id) = 'kitchen'
     and (to_jsonb(new) - 'order_status') is distinct from (to_jsonb(old) - 'order_status') then
    raise exception 'kitchen chỉ được cập nhật order_status' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists orders_kitchen_column_guard on public.orders;
create trigger orders_kitchen_column_guard
  before update on public.orders
  for each row execute function public.enforce_kitchen_order_update();
