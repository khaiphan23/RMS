-- 0021: hardening sau audit.
-- Chạy sau 0020_order_and_reporting_reliability. KHÔNG sửa migration cũ.
-- 1) Anon không còn SELECT trực tiếp menu; chỉ được gọi get_table_menu.
-- 2) order_items chỉ ghi khi đơn ở pending/preparing.
-- 3) Owner đọc được plan gắn với subscription của quán mình.
-- 4) Platform admin không đọc menu qua get_table_menu và không tạo/sửa orders.
-- get_table_menu vẫn là SECURITY DEFINER, search_path = '', public.* qualify đầy đủ.

-- ===== 1. Anon không SELECT trực tiếp menu =====
revoke select on table public.menu_categories from anon;
revoke select on table public.menu_items from anon;
drop policy if exists menu_categories_public_read on public.menu_categories;
drop policy if exists menu_items_public_read on public.menu_items;

-- ===== 2. order_items chỉ được ghi khi đơn còn sửa được =====
create or replace function public.order_is_editable(p_order_id uuid, p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and o.store_id = p_store_id
      and o.order_status in ('pending', 'preparing')
  );
$$;

revoke execute on function public.order_is_editable(uuid, uuid) from public;
grant execute on function public.order_is_editable(uuid, uuid) to authenticated, service_role;

drop policy if exists order_items_insert on public.order_items;
drop policy if exists order_items_update on public.order_items;
drop policy if exists order_items_delete_owner on public.order_items;

create policy order_items_insert on public.order_items
  for insert to authenticated
  with check (
    public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter'])
    and public.order_is_editable(order_id, store_id)
  );

create policy order_items_update on public.order_items
  for update to authenticated
  using (
    public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter'])
    and public.order_is_editable(order_id, store_id)
  )
  with check (
    public.has_store_role(store_id, array['owner', 'manager', 'cashier', 'waiter'])
    and public.order_is_editable(order_id, store_id)
  );

create policy order_items_delete_owner on public.order_items
  for delete to authenticated
  using (
    public.has_store_role(store_id, array['owner'])
    and public.order_is_editable(order_id, store_id)
  );

-- ===== 3. Owner đọc plan của quán mình =====
drop policy if exists plans_owner_read on public.plans;
create policy plans_owner_read on public.plans
  for select to authenticated
  using (
    exists (
      select 1
      from public.subscriptions s
      where s.plan_id = plans.id
        and public.has_store_role(s.store_id, array['owner'])
    )
  );

-- ===== 4. Platform admin không đọc menu qua get_table_menu =====
create or replace function public.get_table_menu(p_store_slug text, p_table_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with store as (
  select id, name from public.store_registry
  where slug = p_store_slug and status = 'active'
  limit 1
),
table_resolved as (
  select t.id, t.table_code, t.name
  from public.tables t
  join store s on t.store_id = s.id
  where t.table_code = p_table_code and t.active
  limit 1
),
menu as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', mc.id,
      'name', mc.name,
      'sort_order', mc.sort_order,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', mi.id,
          'name', mi.name,
          'description', mi.description,
          'price_vnd', mi.price_vnd,
          'image_url', mi.image_url,
          'available', mi.available,
          'sort_order', mi.sort_order
        ) order by mi.sort_order, mi.name)
        from public.menu_items mi
        where mi.category_id = mc.id
          and mi.store_id = (select id from store)
          and mi.available
      ), '[]'::jsonb)
    )
  order by mc.sort_order, mc.name), '[]'::jsonb) as categories
  from public.menu_categories mc
  where mc.store_id = (select id from store) and mc.active
)
select case
  when public.is_platform_admin() then '{}'::jsonb
  when (select count(*) from store) = 0
    or (select count(*) from table_resolved) = 0
  then '{}'::jsonb
  else jsonb_build_object(
    'store_id', (select id from store),
    'store_name', (select name from store),
    'store_slug', p_store_slug,
    'table_id', (select id from table_resolved),
    'table_code', (select table_code from table_resolved),
    'table_name', (select name from table_resolved),
    'categories', (select categories from menu)
  )
end;
$$;

revoke execute on function public.get_table_menu(text, text) from public;
grant execute on function public.get_table_menu(text, text) to anon, authenticated;

-- ===== 5. Platform admin không tạo/sửa đơn =====
-- Trigger này chặn cả place_order (SECURITY DEFINER) vì auth.jwt() vẫn là caller.
create or replace function public.block_platform_admin_order_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_platform_admin() then
    raise exception 'Platform admin không được tạo hoặc sửa đơn hàng.';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_block_platform_admin on public.orders;
create trigger orders_block_platform_admin
before insert or update on public.orders
for each row execute function public.block_platform_admin_order_write();
