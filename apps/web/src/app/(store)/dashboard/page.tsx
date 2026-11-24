import Link from "next/link";

import {
  cardStyle,
  colors,
  gridStyle,
  mutedStyle,
} from "@/components/store/styles";
import { PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import {
  canManageMenu,
  canManageTables,
  canViewPayments,
  canViewReports,
  ROLE_LABELS,
} from "@/lib/permissions/roles";

export default async function DashboardPage() {
  const staff = await requireStaff();

  const shortcuts = [
    {
      href: "/dashboard/menu",
      title: "Thực đơn",
      description: canManageMenu(staff.role)
        ? "Thêm nhóm món, món và giá bán."
        : "Xem thực đơn của quán.",
      visible: true,
    },
    {
      href: "/dashboard/tables",
      title: "Bàn & QR",
      description: canManageTables(staff.role)
        ? "Quản lý bàn và tải mã QR."
        : "Xem bàn và mã QR.",
      visible: true,
    },
    {
      href: "/dashboard/payments",
      title: "Thanh toán",
      description: "Theo dõi thanh toán tiền mặt / chuyển khoản.",
      visible: canViewPayments(staff.role),
    },
    {
      href: "/dashboard/reports",
      title: "Báo cáo",
      description: "Xem báo cáo cơ bản của quán.",
      visible: canViewReports(staff.role),
    },
  ].filter((item) => item.visible);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <PageHeader
        title={`Xin chào, ${staff.displayName || staff.email || "bạn"}`}
        description={`${staff.storeName} · ${ROLE_LABELS[staff.role]}`}
      />

      <div style={gridStyle}>
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...cardStyle,
              textDecoration: "none",
              display: "grid",
              gap: 6,
              borderColor: colors.line,
            }}
          >
            <strong style={{ fontSize: 16 }}>{item.title}</strong>
            <span style={{ ...mutedStyle, margin: 0 }}>{item.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
