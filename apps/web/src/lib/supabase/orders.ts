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

type OrderRow = Omit<OrderView, "table" | "items">;

export async function fetchOrderFeed(
  supabase: SupabaseClient,
  storeId: string,
): Promise<OrderFeedResult> {
  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select("id, table_id, order_status, total_vnd, note, customer_name, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersError) return { orders: [], error: ordersError };

  const rows = (orderRows ?? []) as OrderRow[];
  if (rows.length === 0) return { orders: [], error: null };

  const orderIds = rows.map((order) => order.id);
  const [itemsResult, tablesResult] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, order_id, name_snapshot, unit_price_vnd, quantity, line_total_vnd, created_at",
      )
      .in("order_id", orderIds)
      .order("created_at", { ascending: true }),
    supabase.from("tables").select("id, table_code, name").eq("store_id", storeId),
  ]);

  const error = itemsResult.error ?? tablesResult.error;
  if (error) return { orders: [], error };

  const tableMap = new Map(
    ((tablesResult.data ?? []) as OrderTableView[]).map((table) => [table.id, table]),
  );

  const itemsByOrder = new Map<string, OrderItemView[]>();
  for (const item of (itemsResult.data ?? []) as OrderItemView[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return {
    orders: rows.map((order) => ({
      ...order,
      table: tableMap.get(order.table_id) ?? null,
      items: itemsByOrder.get(order.id) ?? [],
    })),
    error: null,
  };
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
  confirmed: [],
  ready: [],
  completed: [],
  cancelled: [],
};
