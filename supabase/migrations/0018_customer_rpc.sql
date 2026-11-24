-- 0018: hàm RPC cho khách đặt món và xem trạng thái đơn.
-- Chạy sau 0017. KHÔNG sửa migration cũ.
-- Mọi thao tác khách đi qua hàm SECURITY DEFINER này; không dùng service_role
-- ở luồng khách và không mở thêm quyền SELECT/INSERT trực tiếp cho anon trên bảng.
-- Hàm chạy với quyền chủ sở hữu (bypass RLS), nhưng kiểm tra nghiệp vụ bên trong
-- và chặn platform_admin dùng get_order_status để đọc đơn của quán.
-- search_path rỗng tránh xét quyền/schema ngầm; mọi đối tượng gọi đủ schema public.

-- ===== Thu hồi quyền ghi trực tiếp của anon trên store-data (đặt món chỉ qua RPC) =====
revoke insert on public.orders from anon;
revoke insert on public.order_items from anon;

drop policy if exists orders_customer_insert on public.orders;
drop policy if exists order_items_customer_insert on public.order_items;

-- Ràng buộc duy nhất cho order_token (không sửa migration cũ; chỉ thêm index nếu chưa có).
create unique index if not exists orders_order_token_unique_idx on public.orders (order_token);

-- ===== 1. Xem menu của quán qua slug + mã bảng =====
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

-- ===== 2. Khách đặt món (giá lấy từ DB, không nhận giá từ client) =====
create or replace function public.place_order(
  p_store_slug text,
  p_table_code text,
  p_items jsonb,
  p_note text,
  p_order_token text
) returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_table_id uuid;
  v_order_id uuid;
  v_menu_item_id uuid;
  v_name text;
  v_price bigint;
  v_quantity int;
  v_item_note text;
  v_pending int;
  v_order_token_uuid uuid;
  item record;
begin
  if p_order_token is null
     or pg_catalog.length(p_order_token) < 32
     or pg_catalog.length(p_order_token) > 128
     or p_order_token !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Mã đơn hàng không hợp lệ: phải có 32–128 ký tự (A-Z, a-z, 0-9, gạch dưới, gạch ngang).';
  end if;

  begin
    v_order_token_uuid := p_order_token::uuid;
  exception when others then
    raise exception 'Mã đơn hàng không phải định dạng UUID hợp lệ.';
  end;

  if p_note is not null and pg_catalog.length(p_note) > 300 then
    raise exception 'Ghi chú đơn tối đa 300 ký tự.';
  end if;

  if p_items is null then
    raise exception 'Dữ liệu món ăn không hợp lệ.';
  end if;

  if pg_catalog.jsonb_typeof(p_items) <> 'array' then
    raise exception 'Dữ liệu món ăn phải là mảng.';
  end if;

  if pg_catalog.jsonb_array_length(p_items) = 0 then
    raise exception 'Ít nhất 1 dòng món.';
  end if;

  if pg_catalog.jsonb_array_length(p_items) > 30 then
    raise exception 'Tối đa 30 dòng món mỗi đơn.';
  end if;

  select sr.id into v_store_id
  from public.store_registry sr
  where sr.slug = p_store_slug
    and sr.status = 'active'
  limit 1;

  if v_store_id is null then
    raise exception 'Quán không tồn tại hoặc không hoạt động.';
  end if;

  select t.id into v_table_id
  from public.tables t
  where t.table_code = p_table_code
    and t.store_id = v_store_id
    and t.active
  for update;

  if v_table_id is null then
    raise exception 'Bàn không tồn tại hoặc không hoạt động.';
  end if;

  select pg_catalog.count(*) into v_pending
  from public.orders o
  where o.table_id = v_table_id
    and o.order_status = 'pending'
    and o.created_at >= pg_catalog.now() - interval '10 minutes';

  if v_pending >= 5 then
    raise exception 'Bàn này đã có 5 đơn chờ trong 10 phút gần nhất. Vui lòng thử lại sau.';
  end if;

  insert into public.orders (store_id, table_id, order_token, note)
  values (v_store_id, v_table_id, v_order_token_uuid, p_note)
  returning id into v_order_id;

  for item in
    select value as item_json
    from pg_catalog.jsonb_array_elements(p_items) with ordinality as t(value, ord)
  loop
    v_item_note := coalesce(item.item_json->>'note', '');
    if pg_catalog.length(v_item_note) > 300 then
      raise exception 'Ghi chú món tối đa 300 ký tự.';
    end if;

    if (item.item_json->>'menu_item_id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'Món không hợp lệ.';
    end if;

    begin
      v_quantity := (item.item_json->>'quantity')::int;
    exception when others then
      raise exception 'Số lượng không hợp lệ.';
    end;

    if v_quantity is null or v_quantity < 1 or v_quantity > 20 then
      raise exception 'Số lượng món phải từ 1 đến 20.';
    end if;

    begin
      select mi.id, mi.name, mi.price_vnd
      into v_menu_item_id, v_name, v_price
      from public.menu_items mi
      where mi.id = (item.item_json->>'menu_item_id')::uuid
        and mi.store_id = v_store_id
        and mi.available;
    exception when others then
      raise exception 'Món không thuộc quán này hoặc không khả dụng.';
    end;

    if v_menu_item_id is null then
      raise exception 'Món không thuộc quán này hoặc không khả dụng.';
    end if;

    insert into public.order_items (store_id, order_id, menu_item_id, name_snapshot, unit_price_vnd, quantity)
    values (v_store_id, v_order_id, v_menu_item_id, v_name, v_price, v_quantity);
  end loop;

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(text, text, jsonb, text, text) from public;
grant execute on function public.place_order(text, text, jsonb, text, text) to anon, authenticated;

-- ===== 3. Khách xem trạng thái đơn qua token =====
create or replace function public.get_order_status(p_order_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_status public.order_status;
  v_total bigint;
  v_paid bigint;
  v_payment_status text;
  v_items jsonb;
begin
  if public.is_platform_admin() then
    raise exception 'Platform admin không được dùng hàm này.';
  end if;

  if p_order_token is null
     or pg_catalog.length(p_order_token) < 32
     or pg_catalog.length(p_order_token) > 128
     or p_order_token !~ '^[A-Za-z0-9_-]+$' then
    return null;
  end if;

  begin
    select o.id, o.order_status, o.total_vnd
    into v_order_id, v_order_status, v_total
    from public.orders o
    where o.order_token = p_order_token::uuid
    limit 1;
  exception when others then
    return null;
  end;

  if v_order_id is null then
    return null;
  end if;

  select pg_catalog.coalesce(
           pg_catalog.sum(p.amount_vnd) filter (where p.payment_status = 'paid'),
           0
         )
  into v_paid
  from public.payments p
  where p.order_id = v_order_id;

  if v_paid >= v_total then
    v_payment_status := 'paid';
  elsif v_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'unpaid';
  end if;

  select pg_catalog.coalesce(jsonb_agg(jsonb_build_object(
    'menu_item_id', oi.menu_item_id,
    'name_snapshot', oi.name_snapshot,
    'unit_price_vnd', oi.unit_price_vnd,
    'quantity', oi.quantity,
    'line_total_vnd', oi.line_total_vnd
  ) order by oi.created_at, oi.id), '[]'::jsonb)
  into v_items
  from public.order_items oi
  where oi.order_id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_token', p_order_token,
    'order_status', v_order_status,
    'total_vnd', v_total,
    'payment_status', v_payment_status,
    'paid_vnd', v_paid,
    'items', v_items
  );
end;
$$;

revoke execute on function public.get_order_status(text) from public;
grant execute on function public.get_order_status(text) to anon, authenticated;
