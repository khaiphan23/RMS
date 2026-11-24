-- 0017: bật Realtime cho orders/order_items + chặn thu tiền vượt tổng đơn.
-- Chạy sau 0016; KHÔNG sửa 0001-0016.
-- 1) Thêm 2 bảng vào publication supabase_realtime, idempotent.
-- 2) Trigger BEFORE INSERT OR UPDATE payments: khoá orders FOR UPDATE rồi kiểm tra tổng đã thu.
--    UPDATE đổi order_id thì khoá cả đơn cũ và đơn mới theo thứ tự id tăng dần.

-- ===== 1. Realtime publication =====
do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception 'Publication supabase_realtime không tồn tại; không thể bật Realtime.';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end $$;

-- ===== 2. Payment total guard =====
-- Chỉ tiền đã thu (payment_status = 'paid') mới cộng vào tổng; refunded/unpaid không chặn.
create or replace function public.guard_payment_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_paid bigint;
begin
  -- UPDATE không đổi amount/status/order thì bỏ qua.
  if tg_op = 'UPDATE' then
    if new.amount_vnd is not distinct from old.amount_vnd
       and new.payment_status is not distinct from old.payment_status
       and new.order_id is not distinct from old.order_id then
      return new;
    end if;
  end if;

  -- Dòng đang thêm/sửa không phải paid thì cho qua.
  if new.payment_status is distinct from 'paid' then
    return new;
  end if;

  -- Khoá đơn. UPDATE đổi order_id thì khoá cả đơn cũ và mới theo id tăng dần
  -- để hai giao dịch đổi qua lại không tạo deadlock.
  if tg_op = 'UPDATE' then
    if new.order_id is distinct from old.order_id then
      if old.order_id < new.order_id then
        perform 1
        from public.orders o
        where o.id = old.order_id
          and o.store_id = old.store_id
        for update;

        perform 1
        from public.orders o
        where o.id = new.order_id
          and o.store_id = new.store_id
        for update;
      else
        perform 1
        from public.orders o
        where o.id = new.order_id
          and o.store_id = new.store_id
        for update;

        perform 1
        from public.orders o
        where o.id = old.order_id
          and o.store_id = old.store_id
        for update;
      end if;

      select o.total_vnd
        into v_total
        from public.orders o
       where o.id = new.order_id
         and o.store_id = new.store_id
       for update;
    else
      select o.total_vnd
        into v_total
        from public.orders o
       where o.id = new.order_id
         and o.store_id = new.store_id
       for update;
    end if;
  else
    select o.total_vnd
      into v_total
      from public.orders o
     where o.id = new.order_id
       and o.store_id = new.store_id
     for update;
  end if;

  if not found then
    -- FK (order_id, store_id) sẽ báo lỗi; trigger không che mất lỗi đó.
    return new;
  end if;

  -- UPDATE: loại dòng đang sửa khỏi tổng hiện có rồi mới cộng giá trị mới.
  if tg_op = 'UPDATE' then
    select coalesce(sum(p.amount_vnd), 0)::bigint
      into v_paid
      from public.payments p
     where p.order_id = new.order_id
       and p.store_id = new.store_id
       and p.payment_status = 'paid'
       and p.id <> old.id;
  else
    select coalesce(sum(p.amount_vnd), 0)::bigint
      into v_paid
      from public.payments p
     where p.order_id = new.order_id
       and p.store_id = new.store_id
       and p.payment_status = 'paid';
  end if;

  if v_paid + new.amount_vnd > v_total then
    raise exception
      'Tổng thanh toán vượt quá tổng tiền đơn: đã thu %, tổng đơn %, còn lại %.',
      v_paid,
      v_total,
      greatest(v_total - v_paid, 0)
      using errcode = '23514';
  end if;

  return new;
end $$;

drop trigger if exists payments_total_guard on public.payments;
create trigger payments_total_guard
  before insert or update on public.payments
  for each row execute function public.guard_payment_total();
