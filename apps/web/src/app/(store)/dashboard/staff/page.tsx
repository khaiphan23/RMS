import {
  StaffManager,
  type StaffMemberView,
} from "@/components/store/staff-manager";
import { Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import {
  canManageStaff,
  canViewStaff,
  isStaffRole,
} from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { loadStaffEmails } from "./actions";

export const dynamic = "force-dynamic";

type StaffRow = {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  active: boolean;
  created_at: string;
};

export default async function StaffPage() {
  const staff = await requireStaff();

  if (!canViewStaff(staff.role)) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <PageHeader title="Nhân viên" description={staff.storeName} />
        <Notice tone="error">Bạn không có quyền xem danh sách nhân viên.</Notice>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, user_id, role, display_name, active, created_at")
    .eq("store_id", staff.storeId)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <PageHeader title="Nhân viên" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const canManage = canManageStaff(staff.role);
  let emails: Record<string, string | null> = {};
  let emailError: string | null = null;

  if (canManage) {
    const emailResult = await loadStaffEmails();
    if (emailResult.ok) {
      emails = emailResult.emails;
    } else {
      emailError = emailResult.error;
    }
  }

  const members: StaffMemberView[] = [];

  for (const row of (data ?? []) as StaffRow[]) {
    if (!isStaffRole(row.role)) continue;

    members.push({
      id: row.id,
      displayName: row.display_name,
      email: canManage
        ? emails[row.user_id] ?? null
        : row.user_id === staff.userId
          ? staff.email
          : null,
      role: row.role,
      active: row.active,
      isSelf: row.user_id === staff.userId,
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <PageHeader
        title="Nhân viên"
        description={`${staff.storeName} · ${members.length} nhân viên`}
      />

      {emailError ? <Notice tone="info">{emailError}</Notice> : null}

      <StaffManager staff={members} canManage={canManage} />
    </div>
  );
}
