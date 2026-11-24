"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { canManagePayments } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isPaymentMethod,
  type ActionResult,
} from "@/lib/supabase/types";

const vnd = new Intl.NumberFormat("vi-VN");

export async function recordPayment(input: {
  orderId: string;
  amountVnd: number;
  method: string;
  note: string;
}): Promise<ActionResult> {
  const staff = await requireStaff();

  if (!canManagePayments(staff.role)) {
    return { ok: false, error: "Bạn không có quyền ghi nhận thanh toán." };
  }

  if (!input || typeof input.orderId !== "string" || !input.orderId) {
    return { ok: false, error: "Đơn hàng không hợp lệ." };
  }

  if (!isPaymentMethod(input.method)) {
    return { ok: false, error: "Phương thức thanh toán không hợp lệ." };
  }

  if (!Number.isSafeInteger(input.amountVnd) || input.amountVnd <= 0) {
    return { ok: false, error: "Số tiền phải là số nguyên VND lớn hơn 0." };
  }

  const note = typeof input.note === "string" ? input.note.trim() : "";

  const supabase = await createServerSupabaseClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total_vnd, order_status")
    .eq("id", input.orderId)
    .eq("store_id", staff.storeId)
    .maybeSingle();

  if (orderError) {
    return { ok: false, error: friendlyDbError(orderError) };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn trong quán." };
  }
  if (order.order_status === "cancelled") {
    return { ok: false, error: "Không ghi nhận thanh toán cho đơn đã huỷ." };
  }
  if (order.total_vnd <= 0) {
    return { ok: false, error: "Đơn chưa có món hoặc tổng tiền bằng 0." };
  }

  const { data: paidRows, error: paidError } = await supabase
    .from("payments")
    .select("amount_vnd")
    .eq("order_id", input.orderId)
    .eq("store_id", staff.storeId)
    .eq("payment_status", "paid");

  if (paidError) {
    return { ok: false, error: friendlyDbError(paidError) };
  }

  const paid = ((paidRows ?? []) as { amount_vnd: number }[]).reduce(
    (sum, row) => sum + row.amount_vnd,
    0,
  );
  const remaining = order.total_vnd - paid;

  // shortcut: không khoá hàng khi thu tiền; MVP một quầy, nâng cấp bằng RPC transaction khi cần.
  if (remaining <= 0) {
    return { ok: false, error: "Đơn đã được thanh toán đủ." };
  }
  if (input.amountVnd > remaining) {
    return {
      ok: false,
      error: `Số tiền vượt quá phần còn lại (${vnd.format(remaining)} ₫).`,
    };
  }

  const { error: insertError } = await supabase.from("payments").insert({
    store_id: staff.storeId,
    order_id: input.orderId,
    payment_status: "paid",
    method: input.method,
    amount_vnd: input.amountVnd,
    recorded_by: staff.userId,
    note: note || null,
  });

  if (insertError) {
    return { ok: false, error: friendlyDbError(insertError) };
  }

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/reports");
  return { ok: true };
}
