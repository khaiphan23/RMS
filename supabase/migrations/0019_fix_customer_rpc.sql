-- 0019: sửa lỗi runtime của 0018_customer_rpc.sql (đã push lên DB, KHÔNG sửa lại).
-- Lỗi: "function pg_catalog.coalesce(numeric, integer) does not exist" trong public.get_order_status.
-- Nguyên nhân: coalesce (cùng nullif/greatest/least) là cú pháp SQL, không viết kèm pg_catalog.
-- Migration này CREATE OR REPLACE lại hàm bị ảnh hưởng, giữ nguyên chữ ký, SECURITY DEFINER,
-- set search_path = '', và REVOKE/GRANT execute y như 0018.
-- place_order và get_table_menu đã xem lại: không có pg_catalog.coalesce, không bị ảnh hưởng.

-- ===== Sửa public.get_order_status =====
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

  select coalesce(
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

  select coalesce(jsonb_agg(jsonb_build_object(
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
