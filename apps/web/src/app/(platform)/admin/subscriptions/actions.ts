"use server";

import { revalidatePath } from "next/cache";
import { friendlyDbError } from "@/lib/supabase/errors";
import { localDateTime, subscriptionStatuses, type SubscriptionStatus } from "../shared";
import { fail, formText, isUuid, platformWriter } from "../write";

export async function saveSubscription(form: FormData) {
  const admin = await platformWriter();
  if (!admin) return fail("Bạn không có quyền quản trị nền tảng.");

  const id = formText(form, "id");
  const storeId = formText(form, "store_id");
  const planId = formText(form, "plan_id");
  const status = formText(form, "status") as SubscriptionStatus;
  const expiresAt = formText(form, "expires_at");

  if ((id && !isUuid(id)) || (!id && !isUuid(storeId)) || !isUuid(planId)) {
    return fail("Quán, thuê bao hoặc gói dịch vụ không hợp lệ.");
  }
  if (!subscriptionStatuses.includes(status)) return fail("Trạng thái thuê bao không hợp lệ.");

  let expiry: string | null = null;
  if (expiresAt) {
    const normalized = expiresAt.length === 16 ? `${expiresAt}:00` : expiresAt;
    const timestamp = new Date(`${normalized}+07:00`);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized) ||
        !Number.isFinite(timestamp.getTime()) || localDateTime(timestamp.toISOString()) !== normalized) {
      return fail("Ngày hết hạn không hợp lệ.");
    }
    expiry = timestamp.toISOString();
  }

  const payload = { plan_id: planId, status, expires_at: expiry };
  const query = id
    ? admin.from("subscriptions").update(payload).eq("id", id)
    : admin.from("subscriptions").insert({ ...payload, store_id: storeId });
  const { data, error } = await query.select("id").maybeSingle();

  if (error?.code === "23514") return fail("Ngày hết hạn phải sau ngày bắt đầu thuê bao.");
  if (error?.code === "23503") return fail("Quán hoặc gói dịch vụ không tồn tại.");
  if (error) return fail(friendlyDbError(error));
  if (!data) return fail("Không tìm thấy thuê bao.");

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  return { ok: true } as const;
}
