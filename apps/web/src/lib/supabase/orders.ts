import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrderStatus } from "./types";

export type OrderItemView = {
  id: string;
  order_id: string;
  name_snapshot: string;
  unit_price_vnd: number;
  quantity: number;
  line_total_vnd: number;
  created_at: string;
};

export type OrderTableView = {
  id: string;
  table_code: string;
  name: string;
};

export type OrderView = {
  id: string;
  table_id: string;
  order_status: OrderStatus;
  total_vnd: number;
  note: string | null;
  customer_name: string | null;
  created_at: string;
  table: OrderTableView | null;
  items: OrderItemView[];
};

export type OrderFeedResult = {
  orders: OrderView[];
  error: unknown | null;
};

export async function fetchOrderFeed(
  supabase: SupabaseClient,
  storeId: string,
  kitchenOnly = false,
): Promise<OrderFeedResult> {
  const { data, error } = await supabase.rpc("get_store_order_feed", {
    p_store_id: storeId,
    p_kitchen_only: kitchenOnly,
  });

  return { orders: (data ?? []) as OrderView[], error };
}

export type OrderAction = {
  status: OrderStatus;
  label: string;
  tone?: "danger";
};

// Chỉ các bước chuyển hợp lệ; server action kiểm tra lại danh sách này.
export const ORDER_NEXT_ACTIONS: Record<OrderStatus, OrderAction[]> = {
  pending: [
    { status: "preparing", label: "Bắt đầu chuẩn bị" },
    { status: "cancelled", label: "Huỷ", tone: "danger" },
  ],
  confirmed: [
    { status: "preparing", label: "Bắt đầu chuẩn bị" },
    { status: "cancelled", label: "Huỷ", tone: "danger" },
  ],
  preparing: [
    { status: "ready", label: "Đánh dấu sẵn sàng" },
    { status: "cancelled", label: "Huỷ", tone: "danger" },
  ],
  ready: [
    { status: "completed", label: "Hoàn tất" },
    { status: "cancelled", label: "Huỷ", tone: "danger" },
  ],
  completed: [],
  cancelled: [],
};

// Màn hình bếp chỉ cần hai bước này.
export const KITCHEN_NEXT_ACTIONS: Record<OrderStatus, OrderAction[]> = {
  pending: [{ status: "preparing", label: "Bắt đầu chuẩn bị" }],
  preparing: [{ status: "ready", label: "Đánh dấu sẵn sàng" }],
  confirmed: [{ status: "preparing", label: "Bắt đầu chuẩn bị" }],
  ready: [],
  completed: [],
  cancelled: [],
};
