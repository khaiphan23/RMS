"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/supabase/types";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function saveStoreSettings(input: {
  displayName: string;
  address: string;
  phone: string;
  openingHours: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}): Promise<ActionResult> {
  const staff = await requireStaff();

  if (!canManageSettings(staff.role)) {
    return fail("Chỉ chủ quán được sửa thông tin quán.");
  }

  const displayName = cleanText(input.displayName);
  const address = cleanText(input.address);
  const phone = cleanText(input.phone);
  const openingHours = cleanText(input.openingHours);
  const bankName = cleanText(input.bankName);
  const bankAccountNumber = cleanText(input.bankAccountNumber);
  const bankAccountHolder = cleanText(input.bankAccountHolder);

  if (!displayName) return fail("Tên hiển thị không được để trống.");
  if (displayName.length > 120) return fail("Tên hiển thị tối đa 120 ký tự.");
  if (address.length > 255) return fail("Địa chỉ tối đa 255 ký tự.");
  if (phone.length > 50) return fail("Số điện thoại tối đa 50 ký tự.");
  if (openingHours.length > 500) return fail("Giờ mở cửa tối đa 500 ký tự.");
  if (bankName.length > 120) return fail("Tên ngân hàng tối đa 120 ký tự.");
  if (bankAccountNumber.length > 50) return fail("Số tài khoản tối đa 50 ký tự.");
  if (bankAccountHolder.length > 120) return fail("Chủ tài khoản tối đa 120 ký tự.");

  const supabase = await createServerSupabaseClient();
  const { data: current, error: readError } = await supabase
    .from("stores_profile")
    .select("settings")
    .eq("store_id", staff.storeId)
    .maybeSingle();

  if (readError) return fail(friendlyDbError(readError));

  const currentSettings = current && isRecord(current.settings) ? current.settings : {};
  const settings = {
    ...currentSettings,
    display_name: displayName,
    bank_name: bankName,
    bank_account_number: bankAccountNumber,
    bank_account_holder: bankAccountHolder,
  };

  const { error } = await supabase.from("stores_profile").upsert(
    {
      store_id: staff.storeId,
      address: address || null,
      phone: phone || null,
      opening_hours: { text: openingHours },
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id" },
  );

  if (error) return fail(friendlyDbError(error, "Không lưu được thông tin quán."));

  revalidatePath("/dashboard/settings");
  return { ok: true };
}
