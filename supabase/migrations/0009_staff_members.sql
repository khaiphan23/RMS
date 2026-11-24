-- [store-data] staff_members: thành viên quán. MVP không lưu lương/CCCD hay PII nhạy cảm.
-- platform_admin KHÔNG nằm ở đây (xác định bằng claim app_metadata.role).

do $$
begin
  create type public.staff_role as enum ('owner', 'manager', 'cashier', 'waiter', 'kitchen');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index if not exists staff_members_user_id_idx on public.staff_members (user_id);

alter table public.staff_members enable row level security;
alter table public.staff_members force row level security;

grant select, insert, update, delete on public.staff_members to authenticated;
grant select, insert, update, delete on public.staff_members to service_role;
