import {
  MenuManager,
  type MenuCategoryView,
  type MenuItemView,
} from "@/components/store/menu-manager";
import {
  buttonStyle,
  cardStyle,
  colors,
  mutedStyle,
} from "@/components/store/styles";
import { Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import { canManageMenu } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const staff = await requireStaff();
  const supabase = await createServerSupabaseClient();

  const [categoryResult, itemResult] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, sort_order, active")
      .eq("store_id", staff.storeId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price_vnd, available, sort_order")
      .eq("store_id", staff.storeId)
      .order("sort_order")
      .order("name"),
  ]);

  const error = categoryResult.error ?? itemResult.error;

  if (error) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <PageHeader title="Thực đơn" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const categories = (categoryResult.data ?? []) as MenuCategoryView[];
  const items = (itemResult.data ?? []) as MenuItemView[];
  const canEdit = canManageMenu(staff.role);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <PageHeader
        title="Thực đơn"
        description={`${staff.storeName} · ${categories.length} nhóm món · ${items.length} món`}
        actions={
          <Link
            href="/dashboard/tables"
            style={{ ...buttonStyle, background: colors.panel, color: colors.ink, border: `1px solid ${colors.line}` }}
          >
            Bàn & QR
          </Link>
        }
      />

      {!canEdit ? (
        <Notice tone="info">
          Bạn chỉ có quyền xem thực đơn. Chỉ chủ quán và quản lý được thêm/sửa/xoá.
        </Notice>
      ) : null}

      <MenuManager categories={categories} items={items} canEdit={canEdit} />

      <div style={{ ...cardStyle, ...mutedStyle }}>
        Giá lưu bằng số nguyên VND, không dùng số thập phân. RLS vẫn kiểm tra quyền ở phía
        Supabase.
      </div>
    </div>
  );
}
