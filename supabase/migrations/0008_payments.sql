-- [store-data] payments: ghi nhận thanh toán thủ công (tiền mặt / chuyển khoản), tách khỏi trạng thái đơn.

do $$
begin
  create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_registry (id) on delete cascade,
  order_id uuid not null,
  payment_status public.payment_status not null default 'paid',
  method text not null check (method in ('cash', 'bank_transfer')),
  amount_vnd bigint not null check (amount_vnd > 0),
  paid_at timestamptz not null default now(),
  recorded_by uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade
);

create index if not exists payments_store_id_idx on public.payments (store_id);
create index if not exists payments_order_id_idx on public.payments (order_id);

alter table public.payments enable row level security;
alter table public.payments force row level security;

grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.payments to service_role;
