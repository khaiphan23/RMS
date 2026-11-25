import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/platform/admin-nav";
import styles from "@/components/platform/admin.module.css";
import { logoutAction } from "@/lib/auth/actions";
import { getStaffContext } from "@/lib/auth/session";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const context = await getStaffContext();
  if (context.kind === "anonymous") redirect("/login?next=/admin");
  if (context.kind !== "platform_admin") redirect("/dashboard");

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <strong>MicroBiz · Quản trị nền tảng</strong>
        <div className={styles.row}>
          {context.email && <span className={styles.muted}>{context.email}</span>}
          <form action={logoutAction}><button type="submit">Đăng xuất</button></form>
        </div>
      </header>
      <AdminNav />
      <main>{children}</main>
    </div>
  );
}
