"use server";

import { revalidatePath } from "next/cache";
import { friendlyDbError } from "@/lib/supabase/errors";
import { fail, formText, isUuid, platformWriter } from "../write";

export async function savePlan(form: FormData) {
  const admin = await platformWriter();
  if (!admin) return fail("Bạn không có quyền quản trị nền tảng.");

  const id = formText(form, "id");
  const code = formText(form, "code");
  const name = formText(form, "name");
  const setupFee = formText(form, "setup_fee_vnd");
  const monthlyFee = formText(form, "monthly_fee_vnd");

  if (id && !isUuid(id)) return fail("Gói dịch vụ không hợp lệ.");
  if (!code || code.length > 50 || !name || name.length > 160) return fail("Vui lòng nhập mã và tên gói hợp lệ.");
  if (![setupFee, monthlyFee].every((fee) => /^\d+$/.test(fee) && Number.isSafeInteger(Number(fee)))) {
    return fail("Mức phí phải là số nguyên VND từ 0 trở lên.");
  }

  const payload = {
    code,
    name,
    setup_fee_vnd: Number(setupFee),
    monthly_fee_vnd: Number(monthlyFee),
    active: form.get("active") === "on",
  };
  const query = id ? admin.from("plans").update(payload).eq("id", id) : admin.from("plans").insert(payload);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) return fail(friendlyDbError(error));
  if (!data) return fail("Không tìm thấy gói dịch vụ.");

  revalidatePath("/admin/plans");
  revalidatePath("/admin/subscriptions");
  return { ok: true } as const;
}
