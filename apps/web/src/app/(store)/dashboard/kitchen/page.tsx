import { KitchenBoard } from "@/components/store/kitchen-board";
import { pageStyle } from "@/components/store/styles";
import { Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import { canViewKitchen } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { fetchOrderFeed } from "@/lib/supabase/orders";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const staff = await requireStaff();

  if (!canViewKitchen(staff.role)) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Bếp" description={staff.storeName} />
        <Notice tone="error">Bạn không có quyền xem màn hình bếp.</Notice>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { orders, error } = await fetchOrderFeed(supabase, staff.storeId, true);

  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Bếp" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Bếp"
        description={`${staff.storeName} · chỉ đơn chờ và đang chuẩn bị`}
      />
      <KitchenBoard storeId={staff.storeId} initialOrders={orders} />
    </div>
  );
}
