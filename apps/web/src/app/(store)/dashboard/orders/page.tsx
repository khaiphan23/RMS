import { OrdersBoard } from "@/components/store/orders-board";
import { pageStyle } from "@/components/store/styles";
import { Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import { canManageOrders } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { fetchOrderFeed } from "@/lib/supabase/orders";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const staff = await requireStaff();
  const supabase = await createServerSupabaseClient();
  const { orders, error } = await fetchOrderFeed(supabase, staff.storeId);

  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Đơn hàng" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const canUpdate = canManageOrders(staff.role);

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Đơn hàng"
        description={`${staff.storeName} · ${orders.length} đơn hiển thị`}
      />

      {!canUpdate ? (
        <Notice tone="info">
          Bạn chỉ có quyền xem đơn. Cập nhật trạng thái ở màn hình Bếp.
        </Notice>
      ) : null}

      <OrdersBoard
        storeId={staff.storeId}
        initialOrders={orders}
        canUpdate={canUpdate}
      />
    </div>
  );
}
