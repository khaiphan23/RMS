"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { canManageTables } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/supabase/types";

type TableInput = {
  id?: string;
  table_code: string;
  name: string;
  active: boolean;
};

const TABLE_CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function editableStaff() {
  const staff = await requireStaff();
  if (!canManageTables(staff.role)) {
    return { staff: null, error: "Bạn không có quyền sửa bàn." };
  }
  return { staff, error: null };
}

export async function saveTable(input: TableInput): Promise<ActionResult> {
  const { staff, error: permissionError } = await editableStaff();
  if (!staff) return fail(permissionError ?? "Bạn không có quyền sửa bàn.");

  const tableCode = typeof input.table_code === "string" ? input.table_code.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!TABLE_CODE_PATTERN.test(tableCode)) {
    return fail("Mã bàn chỉ gồm chữ, số, gạch ngang hoặc gạch dưới (tối đa 32 ký tự).");
  }
  if (!name) return fail("Tên bàn không được để trống.");

  const supabase = await createServerSupabaseClient();
  const payload = {
    table_code: tableCode,
    name,
    active: Boolean(input.active),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("tables")
      .update(payload)
      .eq("id", input.id)
      .eq("store_id", staff.storeId)
      .select("id")
      .maybeSingle();

    if (error) return fail(friendlyDbError(error));
    if (!data) return fail("Không tìm thấy bàn hoặc bạn không có quyền sửa.");
  } else {
    const { error } = await supabase.from("tables").insert({
      store_id: staff.storeId,
      ...payload,
    });

    if (error) return fail(friendlyDbError(error));
  }

  revalidatePath("/dashboard/tables");
  return { ok: true };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const { staff, error: permissionError } = await editableStaff();
  if (!staff) return fail(permissionError ?? "Bạn không có quyền sửa bàn.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tables")
    .delete()
    .eq("id", id)
    .eq("store_id", staff.storeId)
    .select("id")
    .maybeSingle();

  if (error) return fail(friendlyDbError(error, "Không xoá được bàn."));
  if (!data) return fail("Không tìm thấy bàn hoặc bạn không có quyền xoá.");

  revalidatePath("/dashboard/tables");
  return { ok: true };
}
