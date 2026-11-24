"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logoutAction } from "@/lib/auth/actions";
import {
  canViewKitchen,
  canViewMenu,
  canViewOrders,
  canViewPayments,
  canViewReports,
  canViewSettings,
  canViewStaff,
  canViewTables,
  ROLE_LABELS,
  type StaffRole,
} from "@/lib/permissions/roles";

import { BaseStyles } from "./ui";
import { colors, mutedStyle, secondaryButtonStyle } from "./styles";

type NavItem = {
  href: string;
  label: string;
  visible: (role: StaffRole) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", visible: () => true },
  { href: "/dashboard/orders", label: "Đơn hàng", visible: canViewOrders },
  { href: "/dashboard/kitchen", label: "Bếp", visible: canViewKitchen },
  { href: "/dashboard/menu", label: "Thực đơn", visible: canViewMenu },
  { href: "/dashboard/tables", label: "Bàn & QR", visible: canViewTables },
  { href: "/dashboard/payments", label: "Thanh toán", visible: canViewPayments },
  { href: "/dashboard/reports", label: "Báo cáo", visible: canViewReports },
  { href: "/dashboard/staff", label: "Nhân viên", visible: canViewStaff },
  { href: "/dashboard/settings", label: "Cài đặt", visible: canViewSettings },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StoreShell({
  storeName,
  role,
  displayName,
  email,
  children,
}: {
  storeName: string;
  role: StaffRole;
  displayName: string | null;
  email: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh" }}>
      <BaseStyles />

      <header
        style={{
          background: colors.panel,
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.2, color: colors.brand, fontWeight: 700 }}>
              MICROBIZ
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{storeName}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {displayName || email || "Nhân viên"}
              </div>
              <div style={mutedStyle}>{ROLE_LABELS[role]}</div>
            </div>

            <form action={logoutAction}>
              <button type="submit" style={secondaryButtonStyle}>
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav
        style={{
          background: colors.panel,
          borderBottom: `1px solid ${colors.line}`,
          overflowX: "auto",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 16px",
            display: "flex",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          {NAV_ITEMS.filter((item) => item.visible(role)).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "inline-block",
                  padding: "12px 10px 10px",
                  textDecoration: "none",
                  fontWeight: active ? 700 : 500,
                  color: active ? colors.brand : colors.muted,
                  borderBottom: active ? `2px solid ${colors.brand}` : "2px solid transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "22px 16px 48px" }}>
        {children}
      </main>
    </div>
  );
}
