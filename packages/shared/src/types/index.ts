// Type dùng chung, khớp với supabase/migrations. Đổi schema thì sửa file này cùng lúc.
// Tiền: số nguyên VND (bigint trong DB).

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const STAFF_ROLES = ["owner", "manager", "cashier", "waiter", "kitchen"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STORE_STATUSES = ["active", "suspended", "closed"] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ["draft", "issued", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

type Uuid = string;
type Iso = string;
type DateOnly = string; // YYYY-MM-DD
type Vnd = number;

// ===== platform-data =====

export interface StoreRegistry {
  id: Uuid;
  slug: string;
  name: string;
  owner_user_id: Uuid | null;
  owner_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: StoreStatus;
  registered_at: Iso;
  created_at: Iso;
  updated_at: Iso;
}

export interface Plan {
  id: Uuid;
  code: string;
  name: string;
  setup_fee_vnd: Vnd;
  monthly_fee_vnd: Vnd;
  active: boolean;
  created_at: Iso;
}

export interface Subscription {
  id: Uuid;
  store_id: Uuid;
  plan_id: Uuid;
  status: SubscriptionStatus;
  started_at: Iso;
  expires_at: Iso | null;
  created_at: Iso;
}

export interface SubscriptionInvoice {
  id: Uuid;
  store_id: Uuid;
  subscription_id: Uuid;
  amount_vnd: Vnd;
  period_start: DateOnly;
  period_end: DateOnly;
  status: InvoiceStatus;
  issued_at: Iso | null;
  paid_at: Iso | null;
  note: string | null;
  created_at: Iso;
}

// ===== store-data =====

export interface StoreProfile {
  store_id: Uuid;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  opening_hours: Record<string, unknown> | null;
  settings: Record<string, unknown>;
  created_at: Iso;
  updated_at: Iso;
}

export interface MenuCategory {
  id: Uuid;
  store_id: Uuid;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: Iso;
}

export interface MenuItem {
  id: Uuid;
  store_id: Uuid;
  category_id: Uuid;
  name: string;
  description: string | null;
  price_vnd: Vnd;
  image_url: string | null;
  available: boolean;
  sort_order: number;
  created_at: Iso;
  updated_at: Iso;
}

export interface DiningTable {
  id: Uuid;
  store_id: Uuid;
  /** 'chung' = QR chung của quán (không gắn bàn cụ thể). */
  table_code: string;
  name: string;
  seats: number | null;
  active: boolean;
  created_at: Iso;
}

export interface Order {
  id: Uuid;
  store_id: Uuid;
  table_id: Uuid;
  /** Bearer token cho khách không tài khoản; gửi kèm header x-order-token. */
  order_token: Uuid;
  order_status: OrderStatus;
  total_vnd: Vnd;
  note: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: Iso;
  updated_at: Iso;
}

export interface OrderItem {
  id: Uuid;
  store_id: Uuid;
  order_id: Uuid;
  menu_item_id: Uuid;
  name_snapshot: string;
  unit_price_vnd: Vnd;
  quantity: number;
  /** Cột generated trong DB, không gửi khi insert/update. */
  line_total_vnd: Vnd;
  created_at: Iso;
}

export interface Payment {
  id: Uuid;
  store_id: Uuid;
  order_id: Uuid;
  payment_status: PaymentStatus;
  method: PaymentMethod;
  amount_vnd: Vnd;
  paid_at: Iso;
  recorded_by: Uuid | null;
  note: string | null;
  created_at: Iso;
}

export interface StaffMember {
  id: Uuid;
  store_id: Uuid;
  user_id: Uuid;
  role: StaffRole;
  display_name: string | null;
  active: boolean;
  created_at: Iso;
}
