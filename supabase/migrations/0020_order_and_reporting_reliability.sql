-- Keep the anonymous order RPC signature for existing QR clients.
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
  v_store_active boolean;
  v_table_active boolean;
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

  select sr.id, sr.status = 'active' into v_store_id, v_store_active
  from public.store_registry sr
  where sr.slug = p_store_slug;

  if v_store_id is null then
    raise exception 'Quán không tồn tại hoặc không hoạt động.';
  end if;

  select t.id, t.active into v_table_id, v_table_active
  from public.tables t
  where t.table_code = p_table_code
    and t.store_id = v_store_id
  for update;

  if v_table_id is null then
    raise exception 'Bàn không tồn tại hoặc không hoạt động.';
  end if;

  -- The table lock serializes duplicate requests before checking the existing token.
  select o.id into v_order_id
  from public.orders o
  where o.order_token = v_order_token_uuid
    and o.store_id = v_store_id
    and o.table_id = v_table_id;

  if found then
    return v_order_id;
  end if;

  if not v_store_active then
    raise exception 'Quán không tồn tại hoặc không hoạt động.';
  end if;

  if not v_table_active then
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

create function public.get_store_order_feed(p_store_id uuid, p_kitchen_only boolean)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible_orders as (
    select o.id, o.table_id, o.order_status, o.total_vnd, o.note, o.customer_name, o.created_at
    from public.orders o
    where o.store_id = p_store_id
      and not public.is_platform_admin()
  ),
  recent_orders as (
    select id
    from eligible_orders
    where not p_kitchen_only
    order by created_at desc, id desc
    limit 100
  ),
  feed as (
    select o.*,
           case when t.id is not null
             then jsonb_build_object('id', t.id, 'table_code', t.table_code, 'name', t.name)
           end as "table",
           coalesce(items.lines, '[]'::jsonb) as items
    from eligible_orders o
    left join public.tables t on t.id = o.table_id and t.store_id = p_store_id
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'name_snapshot', oi.name_snapshot,
        'unit_price_vnd', oi.unit_price_vnd,
        'quantity', oi.quantity,
        'line_total_vnd', oi.line_total_vnd,
        'created_at', oi.created_at
      ) order by oi.created_at, oi.id) as lines
      from public.order_items oi
      where oi.store_id = p_store_id and oi.order_id = o.id
    ) items on true
    where o.order_status in ('pending', 'confirmed', 'preparing')
       or (not p_kitchen_only and (
         o.order_status = 'ready' or o.id in (select id from recent_orders)
       ))
  )
  select coalesce(jsonb_agg(to_jsonb(feed) order by feed.created_at desc, feed.id desc), '[]'::jsonb)
  from feed;
$$;

revoke execute on function public.get_store_order_feed(uuid, boolean) from public, anon;
grant execute on function public.get_store_order_feed(uuid, boolean) to authenticated;

create function public.get_store_payment_feed(p_store_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with allowed as (
    select p_store_id as store_id
    where not public.is_platform_admin()
      and public.has_store_role(p_store_id, array['owner', 'manager', 'cashier'])
  ),
  paid as (
    select p.order_id, sum(p.amount_vnd) as paid_vnd
    from public.payments p
    join allowed a on a.store_id = p.store_id
    where p.payment_status = 'paid'
    group by p.order_id
  ),
  open_orders as (
    select o.id, o.order_status, o.created_at, o.note, o.total_vnd,
           t.table_code, t.name as table_name, coalesce(p.paid_vnd, 0) as paid_vnd,
           o.total_vnd - coalesce(p.paid_vnd, 0) as remaining_vnd
    from public.orders o
    join allowed a on a.store_id = o.store_id
    left join paid p on p.order_id = o.id
    left join public.tables t on t.id = o.table_id and t.store_id = o.store_id
    where o.order_status <> 'cancelled' and o.total_vnd > coalesce(p.paid_vnd, 0)
  ),
  recent_payments as (
    select p.id, p.order_id, p.payment_status, p.method, p.amount_vnd, p.paid_at, p.note,
           t.table_code, t.name as table_name
    from public.payments p
    join allowed a on a.store_id = p.store_id
    left join public.orders o on o.id = p.order_id and o.store_id = p.store_id
    left join public.tables t on t.id = o.table_id and t.store_id = p.store_id
    order by p.paid_at desc, p.id desc
    limit 20
  )
  select jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.created_at desc, o.id desc) from open_orders o
    ), '[]'::jsonb),
    'recent_payments', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.paid_at desc, p.id desc) from recent_payments p
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_store_payment_feed(uuid) from public, anon;
grant execute on function public.get_store_payment_feed(uuid) to authenticated;

create function public.get_store_report(p_store_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with period as (
    select (now() at time zone 'Asia/Ho_Chi_Minh')::date as today
    where not public.is_platform_admin()
      and public.has_store_role(p_store_id, array['owner', 'manager'])
  ),
  bounds as (
    select today,
           (today - 29)::timestamp at time zone 'Asia/Ho_Chi_Minh' as starts_at,
           (today + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh' as ends_at
    from period
  ),
  valid_orders as (
    select o.id, (o.created_at at time zone 'Asia/Ho_Chi_Minh')::date as day
    from public.orders o cross join bounds b
    where o.store_id = p_store_id
      and o.order_status <> 'cancelled'
      and o.created_at >= b.starts_at and o.created_at < b.ends_at
  ),
  order_counts as (
    select day, count(*) as orders from valid_orders group by day
  ),
  daily_revenue as (
    select (p.paid_at at time zone 'Asia/Ho_Chi_Minh')::date as day, sum(p.amount_vnd) as revenue
    from public.payments p cross join bounds b
    where p.store_id = p_store_id
      and p.payment_status = 'paid'
      and p.paid_at >= b.starts_at and p.paid_at < b.ends_at
    group by 1
  ),
  days as (
    select today - n as day from period cross join generate_series(0, 29) as offsets(n)
  ),
  top_items as (
    select oi.menu_item_id as id,
           (array_agg(oi.name_snapshot order by oi.created_at desc, oi.id desc))[1] as name,
           sum(oi.quantity) as quantity, sum(oi.line_total_vnd) as revenue
    from public.order_items oi
    join valid_orders o on o.id = oi.order_id
    where oi.store_id = p_store_id
    group by oi.menu_item_id
    order by quantity desc, id
    limit 5
  )
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', d.day, 'orders', coalesce(o.orders, 0), 'revenue', coalesce(r.revenue, 0)
      ) order by d.day desc)
      from days d
      left join order_counts o on o.day = d.day
      left join daily_revenue r on r.day = d.day
    ), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.quantity desc, i.id) from top_items i
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_store_report(uuid) from public, anon;
grant execute on function public.get_store_report(uuid) to authenticated;
