-- Bản chính nằm ở supabase/migrations/0014_rls_platform_admin_limited.sql; file này chỉ để tham chiếu, db push không chạy.
-- Platform admin chỉ đọc platform-data (Q8) — bản chính, db push chạy file này.
-- Bản tham chiếu: supabase/policies/platform-admin-limited.sql
-- Xác định qua claim app_metadata.role = 'platform_admin', không qua staff_members.
--
-- KHÔNG có policy cho platform admin trên: stores_profile, menu_categories, menu_items, tables,
-- orders, order_items, payments, staff_members. RLS bật + không policy = 0 dòng.
-- Ghi dữ liệu platform (tạo quán/gói/thuê bao) đi qua service_role ở server.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'platform_admin';
$$;

grant execute on function public.is_platform_admin() to authenticated, service_role;

-- ===== store_registry =====
drop policy if exists store_registry_platform_read on public.store_registry;
create policy store_registry_platform_read on public.store_registry
  for select to authenticated
  using (public.is_platform_admin());

-- ===== plans =====
drop policy if exists plans_platform_read on public.plans;
create policy plans_platform_read on public.plans
  for select to authenticated
  using (public.is_platform_admin());

-- ===== subscriptions =====
drop policy if exists subscriptions_platform_read on public.subscriptions;
create policy subscriptions_platform_read on public.subscriptions
  for select to authenticated
  using (public.is_platform_admin());

-- ===== subscription_invoices =====
drop policy if exists subscription_invoices_platform_read on public.subscription_invoices;
create policy subscription_invoices_platform_read on public.subscription_invoices
  for select to authenticated
  using (public.is_platform_admin());
