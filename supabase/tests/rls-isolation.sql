-- Kiểm tra RLS thủ công trên DB test (Supabase local/staging), KHÔNG chạy production.
-- Cách chạy: psql "$DATABASE_URL" -f supabase/tests/rls-isolation.sql
--       hoặc dán vào Supabase SQL editor.
-- Cần áp dụng migration 0017 trước khi chạy (publication + payment guard).
--
-- Seed trước khi chạy (thay các <...> bằng UUID thật):
--   * auth users: platform admin (app_metadata.role=platform_admin), owner A, owner B,
--     waiter A, kitchen A. Không tạo bằng SQL, dùng Dashboard.
--   * staff_members active: owner A + waiter A + kitchen A thuộc store A; owner B thuộc store B.
--   * store A/B, tables, menu_items; 1 order của store A (<order-a-id>),
--     1 payment của chính order A (<payment-a-id>), 1 order của store B.
--   * <menu-item-a-id>: 1 món available của store A (test total_vnd + payment guard).
--   * Có thể dùng store mẫu trong seed.sql: store ...101, bàn T01 ...501.
-- Mọi assertion sai sẽ raise exception và rollback.

begin;

-- =========================================================
-- 0. Realtime publication: orders + order_items
-- =========================================================
do $$
declare n int;
begin
  select count(*) into n
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'orders';
  if n <> 1 then
    raise exception 'FAIL: orders chưa có trong publication supabase_realtime';
  end if;

  select count(*) into n
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'order_items';
  if n <> 1 then
    raise exception 'FAIL: order_items chưa có trong publication supabase_realtime';
  end if;

  raise notice 'PASS: orders/order_items có trong publication supabase_realtime';
end $$;

-- =========================================================
-- 1. platform_admin: đọc platform-data được; store-data 0 dòng; không INSERT được
-- =========================================================
select set_config(
  'request.jwt.claims',
  '{"sub":"<platform-admin-user-id>","role":"authenticated","app_metadata":{"role":"platform_admin"}}',
  true
);
set local role authenticated;

do $$
declare n bigint;
begin
  select count(*) into n from public.orders;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % orders', n; end if;

  select count(*) into n from public.order_items;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % order_items', n; end if;

  select count(*) into n from public.payments;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % payments', n; end if;

  select count(*) into n from public.menu_items;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % menu_items', n; end if;

  select count(*) into n from public.menu_categories;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % menu_categories', n; end if;

  select count(*) into n from public.tables;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % tables', n; end if;

  select count(*) into n from public.staff_members;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % staff_members', n; end if;

  select count(*) into n from public.stores_profile;
  if n <> 0 then raise exception 'FAIL: platform_admin đọc được % stores_profile', n; end if;

  raise notice 'PASS: platform_admin không đọc được dữ liệu quán';
end $$;

do $$
declare n bigint;
begin
  select count(*) into n from public.store_registry;
  if n = 0 then raise exception 'FAIL: platform_admin không đọc được store_registry'; end if;

  select count(*) into n from public.plans;
  if n = 0 then raise exception 'FAIL: platform_admin không đọc được plans'; end if;

  select count(*) into n from public.subscriptions;
  if n = 0 then raise exception 'FAIL: platform_admin không đọc được subscriptions'; end if;

  -- Seed có thể không có hóa đơn; chỉ cần không bị từ chối đọc.
  perform count(*) from public.subscription_invoices;

  raise notice 'PASS: platform_admin đọc được platform-data';
end $$;

do $$
begin
  begin
    insert into public.orders (store_id, table_id, order_token)
    values ('<store-a-id>', '<table-a-id>', gen_random_uuid());
    raise exception 'FAIL: platform_admin INSERT được orders';
  exception
    when insufficient_privilege then
      raise notice 'PASS: platform_admin bị chặn INSERT orders';
  end;

  begin
    insert into public.payments (store_id, order_id, method, amount_vnd)
    values ('<store-a-id>', '<order-a-id>', 'cash', 1000);
    raise exception 'FAIL: platform_admin INSERT được payments';
  exception
    when insufficient_privilege then
      raise notice 'PASS: platform_admin bị chặn INSERT payments';
  end;

  begin
    insert into public.staff_members (store_id, user_id, role)
    values ('<store-a-id>', '<platform-admin-user-id>', 'waiter');
    raise exception 'FAIL: platform_admin INSERT được staff_members';
  exception
    when insufficient_privilege then
      raise notice 'PASS: platform_admin bị chặn INSERT staff_members';
  end;
end $$;

-- =========================================================
-- 2. Owner A: không thấy dữ liệu quán B, thấy dữ liệu quán A
-- =========================================================
select set_config(
  'request.jwt.claims',
  '{"sub":"<owner-a-user-id>","role":"authenticated"}',
  true
);

do $$
declare n bigint;
begin
  select count(*) into n from public.orders where store_id = '<store-b-id>';
  if n <> 0 then raise exception 'FAIL: owner A đọc được % đơn quán B', n; end if;

  select count(*) into n from public.order_items where store_id = '<store-b-id>';
  if n <> 0 then raise exception 'FAIL: owner A đọc được % order_items quán B', n; end if;

  select count(*) into n from public.payments where store_id = '<store-b-id>';
  if n <> 0 then raise exception 'FAIL: owner A đọc được % payments quán B', n; end if;

  select count(*) into n from public.menu_items where store_id = '<store-b-id>';
  if n <> 0 then raise exception 'FAIL: owner A đọc được % menu_items quán B', n; end if;

  select count(*) into n from public.staff_members where store_id = '<store-b-id>';
  if n <> 0 then raise exception 'FAIL: owner A đọc được % staff_members quán B', n; end if;

  select count(*) into n from public.stores_profile where store_id = '<store-b-id>';
  if n <> 0 then raise exception 'FAIL: owner A đọc được stores_profile quán B', n; end if;

  raise notice 'PASS: owner A bị cô lập khỏi quán B';
end $$;

do $$
declare n bigint;
begin
  select count(*) into n from public.orders where store_id = '<store-a-id>';
  if n = 0 then raise exception 'FAIL: owner A không đọc được đơn quán mình'; end if;

  select count(*) into n from public.menu_items where store_id = '<store-a-id>';
  if n = 0 then raise exception 'FAIL: owner A không đọc được menu quán mình'; end if;

  raise notice 'PASS: owner A đọc được dữ liệu quán mình';
end $$;

-- =========================================================
-- 3. Waiter A: không xoá được payments, không sửa được total_vnd
-- =========================================================
select set_config(
  'request.jwt.claims',
  '{"sub":"<waiter-a-user-id>","role":"authenticated"}',
  true
);

do $$
declare n int;
begin
  begin
    delete from public.payments where id = '<payment-a-id>';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: waiter xoá được payment'; end if;
  exception
    when insufficient_privilege then
      null; -- 0016 revoke DELETE payments khỏi authenticated
  end;

  raise notice 'PASS: waiter không xoá được payment';
end $$;

do $$
begin
  begin
    update public.orders set total_vnd = total_vnd + 1 where id = '<order-a-id>';
    raise exception 'FAIL: waiter sửa được total_vnd';
  exception
    when insufficient_privilege then
      raise notice 'PASS: waiter bị chặn sửa total_vnd';
  end;
end $$;

-- =========================================================
-- 4. Kitchen A: chỉ sửa được order_status
-- =========================================================
select set_config(
  'request.jwt.claims',
  '{"sub":"<kitchen-a-user-id>","role":"authenticated"}',
  true
);

do $$
declare n int;
begin
  update public.orders set order_status = 'preparing' where id = '<order-a-id>';
  get diagnostics n = row_count;
  if n = 0 then raise exception 'FAIL: kitchen không update được order_status'; end if;

  begin
    update public.orders set note = 'kitchen-sua-cot-khac' where id = '<order-a-id>';
    raise exception 'FAIL: kitchen sửa được cột khác';
  exception
    when insufficient_privilege then
      raise notice 'PASS: kitchen chỉ sửa được order_status';
  end;
end $$;

-- =========================================================
-- 5. total_vnd: bỏ qua số client gửi, tự cộng từ order_items
-- =========================================================
select set_config(
  'request.jwt.claims',
  '{"sub":"<owner-a-user-id>","role":"authenticated"}',
  true
);

do $$
declare
  v_order_id uuid := gen_random_uuid();
  v_price bigint;
  v_total bigint;
begin
  select price_vnd into v_price from public.menu_items where id = '<menu-item-a-id>';
  if v_price is null then raise exception 'FAIL: thiếu <menu-item-a-id> để test total'; end if;

  insert into public.orders (id, store_id, table_id, order_token, total_vnd)
  values (v_order_id, '<store-a-id>', '<table-a-id>', gen_random_uuid(), 999999);

  insert into public.order_items (
    store_id, order_id, menu_item_id, name_snapshot, unit_price_vnd, quantity
  ) values
    ('<store-a-id>', v_order_id, '<menu-item-a-id>', 'Test 1', v_price, 2),
    ('<store-a-id>', v_order_id, '<menu-item-a-id>', 'Test 2', v_price, 1);

  select total_vnd into v_total from public.orders where id = v_order_id;
  if v_total <> v_price * 3 then
    raise exception 'FAIL: total_vnd = %, mong đợi %', v_total, v_price * 3;
  end if;

  delete from public.orders where id = v_order_id;
  raise notice 'PASS: total_vnd tự tính từ order_items, bỏ qua số client gửi';
end $$;

-- =========================================================
-- 6. Payment total guard: chặn INSERT/UPDATE vượt total_vnd (23514)
-- =========================================================
do $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_id2 uuid := gen_random_uuid();
  v_payment_id uuid;
  v_payment_id2 uuid;
  v_price bigint;
  v_total bigint;
  v_total2 bigint;
begin
  -- Kiểm tra tĩnh: trigger phải khoá dòng orders để tránh 2 người thu cùng lúc.
  if coalesce(
    position(
      'for update' in lower(pg_get_functiondef('public.guard_payment_total()'::regprocedure))
    ),
    0
  ) = 0 then
    raise exception 'FAIL: guard_payment_total thiếu FOR UPDATE';
  end if;

  select price_vnd into v_price
  from public.menu_items
  where id = '<menu-item-a-id>';
  if v_price is null then
    raise exception 'FAIL: thiếu <menu-item-a-id> để test payment guard';
  end if;

  -- Đơn 1: thu đủ, thử INSERT/UPDATE vượt tổng, rồi UPDATE giảm.
  insert into public.orders (id, store_id, table_id, order_token)
  values (v_order_id, '<store-a-id>', '<table-a-id>', gen_random_uuid());

  insert into public.order_items (
    store_id, order_id, menu_item_id, name_snapshot, unit_price_vnd, quantity
  ) values (
    '<store-a-id>', v_order_id, '<menu-item-a-id>', 'Test payment guard', v_price, 2
  );

  select total_vnd into v_total from public.orders where id = v_order_id;
  if v_total <> v_price * 2 then
    raise exception 'FAIL: total_vnd payment guard = %, mong đợi %', v_total, v_price * 2;
  end if;
  if v_total < 2 then
    raise exception 'FAIL: total_vnd quá nhỏ để test payment guard';
  end if;

  insert into public.payments (store_id, order_id, method, amount_vnd)
  values ('<store-a-id>', v_order_id, 'cash', v_total)
  returning id into v_payment_id;

  begin
    insert into public.payments (store_id, order_id, method, amount_vnd)
    values ('<store-a-id>', v_order_id, 'cash', 1);
    raise exception 'FAIL: INSERT payment vượt tổng không bị chặn';
  exception
    when check_violation then
      if sqlerrm not like '%vượt quá tổng tiền đơn%' then
        raise exception 'FAIL: thông báo lỗi INSERT không đúng: %', sqlerrm;
      end if;
      raise notice 'PASS: chặn INSERT payment vượt tổng (23514)';
  end;

  begin
    update public.payments
    set amount_vnd = v_total + 1
    where id = v_payment_id;
    raise exception 'FAIL: UPDATE tăng amount_vnd vượt tổng không bị chặn';
  exception
    when check_violation then
      if sqlerrm not like '%vượt quá tổng tiền đơn%' then
        raise exception 'FAIL: thông báo lỗi UPDATE tăng không đúng: %', sqlerrm;
      end if;
      raise notice 'PASS: chặn UPDATE tăng amount_vnd vượt tổng (23514)';
  end;

  update public.payments
  set amount_vnd = v_total - 1
  where id = v_payment_id;
  raise notice 'PASS: UPDATE giảm amount_vnd vẫn được';

  -- Đơn 2: chưa thu (0 paid), tạo payment unpaid vượt tổng rồi đổi sang paid.
  insert into public.orders (id, store_id, table_id, order_token)
  values (v_order_id2, '<store-a-id>', '<table-a-id>', gen_random_uuid());

  insert into public.order_items (
    store_id, order_id, menu_item_id, name_snapshot, unit_price_vnd, quantity
  ) values (
    '<store-a-id>', v_order_id2, '<menu-item-a-id>', 'Test payment guard unpaid', v_price, 2
  );

  select total_vnd into v_total2 from public.orders where id = v_order_id2;
  if v_total2 <> v_price * 2 then
    raise exception 'FAIL: total_vnd payment guard unpaid = %, mong đợi %', v_total2, v_price * 2;
  end if;

  insert into public.payments (
    store_id, order_id, payment_status, method, amount_vnd
  ) values (
    '<store-a-id>', v_order_id2, 'unpaid', 'cash', v_total2 + 1
  ) returning id into v_payment_id2;

  begin
    update public.payments
    set payment_status = 'paid'
    where id = v_payment_id2;
    raise exception 'FAIL: đổi unpaid -> paid vượt tổng không bị chặn';
  exception
    when check_violation then
      if sqlerrm not like '%vượt quá tổng tiền đơn%' then
        raise exception 'FAIL: thông báo lỗi đổi trạng thái không đúng: %', sqlerrm;
      end if;
      raise notice 'PASS: chặn đổi unpaid -> paid vượt tổng (23514)';
  end;
end $$;

-- =========================================================
-- 7. Owner A: không xoá được đơn đã có payment (FK RESTRICT)
-- =========================================================
do $$
begin
  begin
    delete from public.orders where id = '<order-a-id>';
    raise exception 'FAIL: owner A xoá được đơn có payment';
  exception
    when foreign_key_violation then
      raise notice 'PASS: owner A bị chặn xoá đơn có payment';
  end;
end $$;

-- =========================================================
-- 8. Khách (anon): chỉ đọc menu; orders/payments bị từ chối
-- =========================================================
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.headers', '{"x-order-token":"<order-token-a>"}', true);
set local role anon;

do $$
declare n bigint;
begin
  select count(*) into n from public.menu_items;
  if n = 0 then raise exception 'FAIL: anon không đọc được menu_items'; end if;

  select count(*) into n from public.menu_categories;
  if n = 0 then raise exception 'FAIL: anon không đọc được menu_categories'; end if;

  raise notice 'PASS: anon đọc được menu (RLS chỉ món available / nhóm active)';
end $$;

do $$
begin
  begin
    perform count(*) from public.orders;
    raise exception 'FAIL: anon có quyền SELECT orders (mong đợi bị từ chối)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon bị từ chối SELECT orders';
  end;
end $$;

do $$
begin
  begin
    perform count(*) from public.payments;
    raise exception 'FAIL: anon có quyền SELECT payments (mong đợi bị từ chối)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon bị từ chối SELECT payments';
  end;
end $$;

reset role;
rollback;
