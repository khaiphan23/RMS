-- [platform-data] store_registry: bảng gốc của quán, tạo đầu tiên; mọi bảng store-data tham chiếu id ở đây.
-- Chỉ platform admin đọc thông tin liên hệ/trạng thái (Q8); khách chỉ thấy id/slug/name/status qua grant cột.

create table if not exists public.store_registry (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner_user_id uuid references auth.users (id) on delete set null,
  owner_name text,
  contact_phone text,
  contact_email text,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_registry enable row level security;
alter table public.store_registry force row level security;

grant select on public.store_registry to authenticated;
grant select, insert, update, delete on public.store_registry to service_role;
