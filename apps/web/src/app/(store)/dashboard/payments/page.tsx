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
export const dynamic = "force-dynamic";

type PaymentFeed = {
  orders: PaymentOrderView[];
  recent_payments: PaymentHistoryView[];
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
  const { data, error } = await supabase.rpc("get_store_payment_feed", {
    p_store_id: staff.storeId,
  });
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Thanh toán" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const { orders, recent_payments: recentPayments } = data as PaymentFeed;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Thanh toán"
        description={`${staff.storeName} · ${orders.length} đơn cần thu`}
      />
      <Notice tone="info">
        Trạng thái thanh toán tách riêng khỏi trạng thái đơn. Trang này không có nút xoá
        thanh toán.
      </Notice>
      <PaymentsManager orders={orders} recentPayments={recentPayments} />
    </div>
  );
}
