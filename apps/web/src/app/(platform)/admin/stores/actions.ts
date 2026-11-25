"use server";

import { revalidatePath } from "next/cache";
import { friendlyDbError } from "@/lib/supabase/errors";
import { storeStatuses, type StoreStatus } from "../shared";
import { fail, formText, isUuid, platformWriter } from "../write";

export async function updateStore(form: FormData) {
  const admin = await platformWriter();
  if (!admin) return fail("Bạn không có quyền quản trị nền tảng.");

  const id = formText(form, "id");
  const status = formText(form, "status") as StoreStatus;
  const ownerId = formText(form, "owner_user_id");
  const ownerName = formText(form, "owner_name");
  const contactPhone = formText(form, "contact_phone");
  const contactEmail = formText(form, "contact_email");

  if (!isUuid(id) || !storeStatuses.includes(status)) return fail("Quán hoặc trạng thái không hợp lệ.");
  if (ownerId && !isUuid(ownerId)) return fail("ID tài khoản chủ quán phải là UUID.");
  if (ownerName.length > 160 || contactPhone.length > 40 || contactEmail.length > 254) {
    return fail("Thông tin liên hệ vượt quá độ dài cho phép.");
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return fail("Email liên hệ không hợp lệ.");
  }

  const { data, error } = await admin.from("store_registry").update({
    status,
    owner_user_id: ownerId || null,
    owner_name: ownerName || null,
    contact_phone: contactPhone || null,
    contact_email: contactEmail || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id").maybeSingle();

  if (error?.code === "23503") return fail("ID tài khoản chủ quán không tồn tại.");
  if (error) return fail(friendlyDbError(error));
  if (!data) return fail("Không tìm thấy quán.");

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  return { ok: true } as const;
}
