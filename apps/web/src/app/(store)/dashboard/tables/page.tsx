import Link from "next/link";

import {
  TablesManager,
  type DiningTableView,
} from "@/components/store/tables-manager";
import {
  buttonStyle,
  cardStyle,
  colors,
  mutedStyle,
} from "@/components/store/styles";
import { Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import { canManageTables } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const staff = await requireStaff();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tables")
    .select("id, table_code, name, active")
    .eq("store_id", staff.storeId)
    .order("table_code");

  if (error) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <PageHeader title="Bàn & QR" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const tables = (data ?? []) as DiningTableView[];
  const canEdit = canManageTables(staff.role);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <PageHeader
        title="Bàn & QR"
        description={`${staff.storeName} · ${tables.length} bàn`}
        actions={
          <Link
            href="/dashboard/menu"
            style={{ ...buttonStyle, background: colors.panel, color: colors.ink, border: `1px solid ${colors.line}` }}
          >
            Thực đơn
          </Link>
        }
      />

      {!canEdit ? (
        <Notice tone="info">
          Bạn chỉ có quyền xem bàn và tải QR. Chỉ chủ quán và quản lý được thêm/sửa/xoá.
        </Notice>
      ) : null}

      <TablesManager
        tables={tables}
        canEdit={canEdit}
        storeSlug={staff.storeSlug}
        storeName={staff.storeName}
      />

      <div style={{ ...cardStyle, ...mutedStyle }}>
        Mẹo: QR chung của quán là một bàn có mã <code>chung</code>. Mỗi bàn nên có mã ngắn,
        không dấu, không khoảng trắng.
      </div>
    </div>
  );
}
