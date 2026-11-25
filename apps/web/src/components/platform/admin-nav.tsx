"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const links = [
  ["/admin", "Tổng quan"],
  ["/admin/stores", "Cửa hàng"],
  ["/admin/plans", "Gói dịch vụ"],
  ["/admin/subscriptions", "Thuê bao"],
  ["/admin/support", "Hỗ trợ"],
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Quản trị nền tảng">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
