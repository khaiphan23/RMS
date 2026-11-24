"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import {
  canManageStaff,
  isAssignableStaffRole,
} from "@/lib/permissions/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/supabase/types";

export type StaffEmailResult =
  | { ok: true; emails: Record<string, string | null> }
  | { ok: false; error: string };

type TargetStaff = {
  id: string;
  user_id: string;
  role: string;
  active: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function authError(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const message = String((error as { message?: unknown }).message ?? "");

  if (/already.*(registered|exists)|user already registered/i.test(message)) {
    return "Email đã được sử dụng.";
  }
  if (/password/i.test(message)) {
    return "Mật khẩu tạm không hợp lệ.";
  }
  if (/not found/i.test(message)) {
    return "Không tìm thấy tài khoản đăng nhập.";
  }

  return fallback;
}

async function ownerStaff() {
  const staff = await requireStaff();
  if (!canManageStaff(staff.role)) {
    return { staff: null, error: "Chỉ chủ quán được quản lý nhân viên." };
  }
  return { staff, error: null };
}

async function targetStaff(storeId: string, staffId: unknown) {
  if (typeof staffId !== "string" || !staffId) {
    return { target: null, error: "Nhân viên không hợp lệ." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, user_id, role, active")
    .eq("id", staffId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) return { target: null, error: friendlyDbError(error) };
  if (!data) return { target: null, error: "Không tìm thấy nhân viên trong quán." };

  return { target: data as TargetStaff, error: null };
}

export async function loadStaffEmails(): Promise<StaffEmailResult> {
  const { staff, error: permissionError } = await ownerStaff();
  if (!staff) return { ok: false, error: permissionError ?? "Không có quyền xem email." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("user_id")
    .eq("store_id", staff.storeId);

  if (error) return { ok: false, error: friendlyDbError(error) };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Chưa cấu hình quyền quản trị để xem email." };
  }

  const emails: Record<string, string | null> = {};

  await Promise.all(
    ((data ?? []) as { user_id: string }[]).map(async (row) => {
      try {
        const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
        emails[row.user_id] = userData.user?.email ?? null;
      } catch {
        emails[row.user_id] = null;
      }
    }),
  );

  return { ok: true, emails };
}

export async function addStaffMember(input: {
  email: string;
  displayName: string;
  role: string;
  password: string;
}): Promise<ActionResult> {
  const { staff, error: permissionError } = await ownerStaff();
  if (!staff) return fail(permissionError ?? "Chỉ chủ quán được thêm nhân viên.");

  const email = cleanText(input.email).toLowerCase();
  const displayName = cleanText(input.displayName);
  const password = typeof input.password === "string" ? input.password : "";

  if (!EMAIL_PATTERN.test(email)) return fail("Email không hợp lệ.");
  if (!displayName) return fail("Tên hiển thị không được để trống.");
  if (displayName.length > 120) return fail("Tên hiển thị tối đa 120 ký tự.");
  if (!isAssignableStaffRole(input.role)) {
    return fail("Chỉ được gán vai trò quản lý, thu ngân, phục vụ hoặc bếp.");
  }
  if (password.length < 6) return fail("Mật khẩu tạm phải có ít nhất 6 ký tự.");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Chưa cấu hình quyền quản trị để thêm nhân viên.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return fail(authError(createError, "Không tạo được tài khoản cho nhân viên."));
  }

  const supabase = await createServerSupabaseClient();
  const { error: insertError } = await supabase.from("staff_members").insert({
    store_id: staff.storeId,
    user_id: created.user.id,
    role: input.role,
    display_name: displayName,
    active: true,
  });

  if (insertError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(created.user.id);
    if (cleanupError) {
      return fail("Không thêm được nhân viên và chưa xoá được tài khoản tạm. Vui lòng thử lại.");
    }
    return fail(friendlyDbError(insertError, "Không thêm được nhân viên."));
  }

  revalidatePath("/dashboard/staff");
  return { ok: true };
}

export async function updateStaffRole(input: {
  staffId: string;
  role: string;
}): Promise<ActionResult> {
  const { staff, error: permissionError } = await ownerStaff();
  if (!staff) return fail(permissionError ?? "Chỉ chủ quán được đổi vai trò.");

  if (!isAssignableStaffRole(input.role)) {
    return fail("Chỉ được gán vai trò quản lý, thu ngân, phục vụ hoặc bếp.");
  }

  const { target, error: targetError } = await targetStaff(staff.storeId, input.staffId);
  if (!target) return fail(targetError ?? "Không tìm thấy nhân viên trong quán.");

  if (target.user_id === staff.userId) {
    return fail("Bạn không thể tự đổi vai trò của mình.");
  }
  if (target.role === "owner") {
    return fail("Không thể đổi vai trò chủ quán.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .update({ role: input.role })
    .eq("id", target.id)
    .eq("store_id", staff.storeId)
    .select("id")
    .maybeSingle();

  if (error) return fail(friendlyDbError(error));
  if (!data) return fail("Không tìm thấy nhân viên trong quán.");

  revalidatePath("/dashboard/staff");
  return { ok: true };
}

export async function resetStaffPassword(input: {
  staffId: string;
  password: string;
}): Promise<ActionResult> {
  const { staff, error: permissionError } = await ownerStaff();
  if (!staff) return fail(permissionError ?? "Chỉ chủ quán được đặt lại mật khẩu.");

  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < 6) return fail("Mật khẩu tạm phải có ít nhất 6 ký tự.");

  const { target, error: targetError } = await targetStaff(staff.storeId, input.staffId);
  if (!target) return fail(targetError ?? "Không tìm thấy nhân viên trong quán.");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Chưa cấu hình quyền quản trị để đặt lại mật khẩu.");
  }

  const { error } = await admin.auth.admin.updateUserById(target.user_id, { password });
  if (error) return fail(authError(error, "Không đặt lại được mật khẩu."));

  return { ok: true };
}

export async function setStaffActive(input: {
  staffId: string;
  active: boolean;
}): Promise<ActionResult> {
  const { staff, error: permissionError } = await ownerStaff();
  if (!staff) return fail(permissionError ?? "Chỉ chủ quán được khoá/mở khoá nhân viên.");

  if (typeof input.active !== "boolean") return fail("Trạng thái không hợp lệ.");

  const { target, error: targetError } = await targetStaff(staff.storeId, input.staffId);
  if (!target) return fail(targetError ?? "Không tìm thấy nhân viên trong quán.");

  if (target.user_id === staff.userId) {
    return fail("Bạn không thể tự khoá hoặc tự mở khoá tài khoản của mình.");
  }
  if (target.role === "owner") {
    return fail("Không thể khoá tài khoản chủ quán.");
  }
  if (target.active === input.active) return { ok: true };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Chưa cấu hình quyền quản trị để khoá/mở khoá nhân viên.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .update({ active: input.active })
    .eq("id", target.id)
    .eq("store_id", staff.storeId)
    .select("id")
    .maybeSingle();

  if (error) return fail(friendlyDbError(error));
  if (!data) return fail("Không tìm thấy nhân viên trong quán.");

  const { error: authErrorResult } = await admin.auth.admin.updateUserById(target.user_id, {
    ban_duration: input.active ? "none" : "876000h",
  });

  if (authErrorResult) {
    await supabase
      .from("staff_members")
      .update({ active: target.active })
      .eq("id", target.id)
      .eq("store_id", staff.storeId);

    return fail("Không cập nhật được trạng thái đăng nhập. Vui lòng thử lại.");
  }

  revalidatePath("/dashboard/staff");
  return { ok: true };
}
