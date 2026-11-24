import {
  PaymentsManager,
  type PaymentHistoryView,
  type PaymentOrderView,
} from "@/components/store/payments-manager";
import { pageStyle } from "@/components/store/styles";
import { Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import { canViewPayments } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  table_id: string;
  order_status: OrderStatus;
  total_vnd: number;
  note: string | null;
  created_at: string;
};

type TableRow = {
  id: string;
  table_code: string;
  name: string;
};

type PaymentRow = {
  id: string;
  order_id: string;
  payment_status: PaymentStatus;
  method: PaymentMethod;
  amount_vnd: number;
  paid_at: string;
  note: string | null;
};

export default async function PaymentsPage() {
  const staff = await requireStaff();

  if (!canViewPayments(staff.role)) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Thanh toán" description={staff.storeName} />
        <Notice tone="error">Bạn không có quyền xem thanh toán.</Notice>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const [ordersResult, tablesResult, paymentsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, table_id, order_status, total_vnd, note, created_at")
      .eq("store_id", staff.storeId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("tables").select("id, table_code, name").eq("store_id", staff.storeId),
    supabase
      .from("payments")
      .select("id, order_id, payment_status, method, amount_vnd, paid_at, note")
      .eq("store_id", staff.storeId)
      .order("paid_at", { ascending: false })
      .limit(1000),
  ]);

  const error = ordersResult.error ?? tablesResult.error ?? paymentsResult.error;
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Thanh toán" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const orders = (ordersResult.data ?? []) as OrderRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const tableMap = new Map(
    ((tablesResult.data ?? []) as TableRow[]).map((table) => [table.id, table]),
  );

  const paidByOrder = new Map<string, number>();
  for (const payment of payments) {
    if (payment.payment_status !== "paid") continue;
    paidByOrder.set(
      payment.order_id,
      (paidByOrder.get(payment.order_id) ?? 0) + payment.amount_vnd,
    );
  }

  const paymentOrders: PaymentOrderView[] = orders
    .map((order) => {
      const table = tableMap.get(order.table_id);
      const paid = paidByOrder.get(order.id) ?? 0;
      return {
        id: order.id,
        table_code: table?.table_code ?? null,
        table_name: table?.name ?? null,
        order_status: order.order_status,
        total_vnd: order.total_vnd,
        paid_vnd: paid,
        remaining_vnd: Math.max(order.total_vnd - paid, 0),
        created_at: order.created_at,
        note: order.note,
      };
    })
    .sort((a, b) => {
      const aOpen = a.remaining_vnd > 0 ? 0 : 1;
      const bOpen = b.remaining_vnd > 0 ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const recentPayments: PaymentHistoryView[] = payments.slice(0, 20).map((payment) => {
    const order = orderMap.get(payment.order_id);
    const table = order ? tableMap.get(order.table_id) : undefined;
    return {
      id: payment.id,
      order_id: payment.order_id,
      table_code: table?.table_code ?? null,
      table_name: table?.name ?? null,
      payment_status: payment.payment_status,
      method: payment.method,
      amount_vnd: payment.amount_vnd,
      paid_at: payment.paid_at,
      note: payment.note,
    };
  });

  const openCount = paymentOrders.filter(
    (order) => order.remaining_vnd > 0 && order.order_status !== "cancelled",
  ).length;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Thanh toán"
        description={`${staff.storeName} · ${openCount} đơn cần thu`}
      />
      <Notice tone="info">
        Trạng thái thanh toán tách riêng khỏi trạng thái đơn. Trang này không có nút xoá
        thanh toán.
      </Notice>
      <PaymentsManager orders={paymentOrders} recentPayments={recentPayments} />
    </div>
  );
}
