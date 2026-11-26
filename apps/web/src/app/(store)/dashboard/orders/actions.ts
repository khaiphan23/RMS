"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { canManageOrders } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import {
  KITCHEN_NEXT_ACTIONS,
  ORDER_NEXT_ACTIONS,
} from "@/lib/supabase/orders";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrderStatus, type ActionResult } from "@/lib/supabase/types";

export async function updateOrderStatus(
  orderId: string,
  nextStatus: string,
): Promise<ActionResult> {
  const staff = await requireStaff();

  if (typeof orderId !== "string" || !orderId) {
    return { ok: false, error: "Đơn hàng không hợp lệ." };
  }

  if (!isOrderStatus(nextStatus)) {
    return { ok: false, error: "Trạng thái đơn không hợp lệ." };
  }

  const isKitchen = staff.role === "kitchen";
  if (!isKitchen && !canManageOrders(staff.role)) {
    return { ok: false, error: "Bạn không có quyền đổi trạng thái đơn." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("id, order_status")
    .eq("id", orderId)
    .eq("store_id", staff.storeId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: friendlyDbError(readError) };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn trong quán." };
  }
  if (!isOrderStatus(order.order_status)) {
    return { ok: false, error: "Trạng thái đơn không hợp lệ." };
  }

  const actions = isKitchen
    ? KITCHEN_NEXT_ACTIONS[order.order_status]
    : ORDER_NEXT_ACTIONS[order.order_status];

  if (!actions.some((action) => action.status === nextStatus)) {
    return {
      ok: false,
      error: isKitchen
        ? "Bếp chỉ được chuyển đơn chờ sang đang chuẩn bị, hoặc đang chuẩn bị sang sẵn sàng."
        : "Không thể chuyển trạng thái theo hướng này.",
    };
  }

  // Bếp chỉ gửi đúng cột order_status; trigger sẽ chặn nếu gửi thêm cột khác.
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ order_status: nextStatus })
    .eq("id", orderId)
    .eq("store_id", staff.storeId)
    .eq("order_status", order.order_status)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { ok: false, error: friendlyDbError(updateError) };
  }
  if (!updated) {
    return { ok: false, error: "Đơn đã thay đổi. Tải lại danh sách trước khi cập nhật." };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/kitchen");
  return { ok: true };
}
