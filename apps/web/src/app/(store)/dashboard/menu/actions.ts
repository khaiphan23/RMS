"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { canManageMenu } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/supabase/types";

type CategoryInput = {
  id?: string;
  name: string;
  sort_order: number;
  active: boolean;
};

type ItemInput = {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price_vnd: number;
  available: boolean;
  sort_order: number;
};

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanSortOrder(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) ? number : null;
}

async function editableStaff() {
  const staff = await requireStaff();
  if (!canManageMenu(staff.role)) {
    return { staff: null, error: "Bạn không có quyền sửa thực đơn." };
  }
  return { staff, error: null };
}

export async function saveCategory(input: CategoryInput): Promise<ActionResult> {
  const { staff, error: permissionError } = await editableStaff();
  if (!staff) return fail(permissionError ?? "Bạn không có quyền sửa thực đơn.");

  const name = cleanName(input.name);
  const sortOrder = cleanSortOrder(input.sort_order);
  if (!name) return fail("Tên nhóm món không được để trống.");
  if (sortOrder === null) return fail("Thứ tự phải là số nguyên.");

  const supabase = await createServerSupabaseClient();
  const payload = {
    name,
    sort_order: sortOrder,
    active: Boolean(input.active),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("menu_categories")
      .update(payload)
      .eq("id", input.id)
      .eq("store_id", staff.storeId)
      .select("id")
      .maybeSingle();

    if (error) return fail(friendlyDbError(error));
    if (!data) return fail("Không tìm thấy nhóm món hoặc bạn không có quyền sửa.");
  } else {
    const { error } = await supabase.from("menu_categories").insert({
      store_id: staff.storeId,
      ...payload,
    });

    if (error) return fail(friendlyDbError(error));
  }

  revalidatePath("/dashboard/menu");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { staff, error: permissionError } = await editableStaff();
  if (!staff) return fail(permissionError ?? "Bạn không có quyền sửa thực đơn.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", id)
    .eq("store_id", staff.storeId)
    .select("id")
    .maybeSingle();

  if (error) return fail(friendlyDbError(error, "Không xoá được nhóm món."));
  if (!data) return fail("Không tìm thấy nhóm món hoặc bạn không có quyền xoá.");

  revalidatePath("/dashboard/menu");
  return { ok: true };
}

export async function saveItem(input: ItemInput): Promise<ActionResult> {
  const { staff, error: permissionError } = await editableStaff();
  if (!staff) return fail(permissionError ?? "Bạn không có quyền sửa thực đơn.");

  const name = cleanName(input.name);
  const description = cleanName(input.description);
  const price = typeof input.price_vnd === "number" ? input.price_vnd : Number(input.price_vnd);
  const sortOrder = cleanSortOrder(input.sort_order);

  if (!name) return fail("Tên món không được để trống.");
  if (!Number.isSafeInteger(price) || price < 0) {
    return fail("Giá phải là số nguyên VND không âm.");
  }
  if (sortOrder === null) return fail("Thứ tự phải là số nguyên.");
  if (!input.category_id) return fail("Vui lòng chọn nhóm món.");

  const supabase = await createServerSupabaseClient();

  const { data: category, error: categoryError } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("id", input.category_id)
    .eq("store_id", staff.storeId)
    .maybeSingle();

  if (categoryError) return fail(friendlyDbError(categoryError));
  if (!category) return fail("Nhóm món không tồn tại trong quán này.");

  const payload = {
    category_id: input.category_id,
    name,
    description: description || null,
    price_vnd: price,
    available: Boolean(input.available),
    sort_order: sortOrder,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("menu_items")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .eq("store_id", staff.storeId)
      .select("id")
      .maybeSingle();

    if (error) return fail(friendlyDbError(error));
    if (!data) return fail("Không tìm thấy món hoặc bạn không có quyền sửa.");
  } else {
    const { error } = await supabase.from("menu_items").insert({
      store_id: staff.storeId,
      ...payload,
    });

    if (error) return fail(friendlyDbError(error));
  }

  revalidatePath("/dashboard/menu");
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const { staff, error: permissionError } = await editableStaff();
  if (!staff) return fail(permissionError ?? "Bạn không có quyền sửa thực đơn.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("store_id", staff.storeId)
    .select("id")
    .maybeSingle();

  if (error) return fail(friendlyDbError(error, "Không xoá được món."));
  if (!data) return fail("Không tìm thấy món hoặc bạn không có quyền xoá.");

  revalidatePath("/dashboard/menu");
  return { ok: true };
}
