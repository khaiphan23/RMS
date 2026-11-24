-- Seed dữ liệu mẫu. Chạy trên DB trống: `supabase db reset` (tự chạy sau migrations)
-- hoặc dán vào SQL editor. KHÔNG chạy trên production.
--
-- KHÔNG tạo user trong auth.users bằng SQL (mật khẩu phải qua GoTrue).
-- Tạo trên Dashboard > Authentication > Users:
--   platform@example.com  -> app_metadata {"role":"platform_admin"}  (KHÔNG dùng user_metadata)
--   owner@example.com     -> owner quán mẫu
--   waiter@example.com    -> waiter quán mẫu
--   (chạy test RLS cần thêm kitchen@example.com)
--
-- Sau khi có UUID, gán staff (thay <...>):
--   insert into public.staff_members (store_id, user_id, role) values
--     ('00000000-0000-0000-0000-000000000101', '<owner-uuid>',   'owner'),
--     ('00000000-0000-0000-0000-000000000101', '<waiter-uuid>',  'waiter'),
--     ('00000000-0000-0000-0000-000000000101', '<kitchen-uuid>', 'kitchen');
-- Tùy chọn: update public.store_registry set owner_user_id = '<owner-uuid>'
--   where id = '00000000-0000-0000-0000-000000000101';

-- 1 gói
insert into public.plans (id, code, name, setup_fee_vnd, monthly_fee_vnd, active)
values ('00000000-0000-0000-0000-000000000001', 'basic', 'Gói Cơ bản', 0, 299000, true)
on conflict do nothing;

-- 1 quán mẫu
insert into public.store_registry (
  id, slug, name, owner_name, contact_phone, contact_email, status
)
values (
  '00000000-0000-0000-0000-000000000101',
  'quan-mau',
  'Quán Mẫu',
  'Chủ Quán Mẫu',
  '0900000000',
  'owner@example.com',
  'active'
)
on conflict do nothing;

-- 1 thuê bao
insert into public.subscriptions (id, store_id, plan_id, status, started_at, expires_at)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'active',
  now(),
  now() + interval '1 year'
)
on conflict do nothing;

-- 5 bàn T01-T05 (QR chung dùng thêm dòng table_code = 'chung' khi cần)
insert into public.tables (id, store_id, table_code, name, seats, active)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 'T01', 'Bàn 1', 4, true),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000101', 'T02', 'Bàn 2', 4, true),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000101', 'T03', 'Bàn 3', 4, true),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000101', 'T04', 'Bàn 4', 4, true),
  ('00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000101', 'T05', 'Bàn 5', 4, true)
on conflict do nothing;

-- 2 nhóm menu
insert into public.menu_categories (id, store_id, name, sort_order, active)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', 'Món chính', 1, true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000101', 'Đồ uống', 2, true)
on conflict do nothing;

-- 6 món
insert into public.menu_items (
  id, store_id, category_id, name, description, price_vnd, available, sort_order
)
values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', 'Phở bò', 'Phở bò tái nạm', 55000, true, 1),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', 'Cơm gà', 'Cơm gà nướng', 45000, true, 2),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', 'Bún chả', 'Bún chả Hà Nội', 50000, true, 3),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', 'Gỏi cuốn', 'Gỏi cuốn tôm thịt', 30000, true, 4),
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000302', 'Trà đá', null, 5000, true, 1),
  ('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000302', 'Cà phê sữa', 'Cà phê sữa đá', 25000, true, 2)
on conflict do nothing;
