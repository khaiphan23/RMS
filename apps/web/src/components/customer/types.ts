import type { OrderStatus } from "@/lib/supabase/types";

export type TableRoute = { storeSlug: string; tableCode: string };

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price_vnd: number;
  image_url: string | null;
  available: boolean;
};

export type TableMenu = {
  store_id: string;
  store_name: string;
  table_name: string;
  categories: { id: string; name: string; items: MenuItem[] }[];
};

export type CustomerOrder = {
  order_id: string;
  order_status: OrderStatus;
  payment_status: "unpaid" | "partial" | "paid";
  total_vnd: number;
  paid_vnd: number;
  items: { name_snapshot: string; quantity: number; line_total_vnd: number }[];
};

export const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
