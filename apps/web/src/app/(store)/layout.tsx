import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { StoreShell } from "@/components/store/store-shell";
import {
  buttonStyle,
  cardStyle,
  colors,
  mutedStyle,
  secondaryButtonStyle,
} from "@/components/store/styles";
import { BaseStyles } from "@/components/store/ui";
import { logoutAction } from "@/lib/auth/actions";
import { getStaffContext } from "@/lib/auth/session";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  let context;

  try {
    context = await getStaffContext();
  } catch {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <BaseStyles />
        <div style={{ ...cardStyle, maxWidth: 460, display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Không tải được dữ liệu quán</h1>
          <p style={{ ...mutedStyle, margin: 0 }}>
            Phiên đăng nhập có thể đã hết hạn hoặc kết nối Supabase đang lỗi.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={buttonStyle}>
              Thử lại
            </Link>
            <form action={logoutAction}>
              <button type="submit" style={secondaryButtonStyle}>
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (context.kind === "anonymous") redirect("/login");
  if (context.kind === "platform_admin") redirect("/admin");

  if (context.kind === "unassigned") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: `radial-gradient(circle at top, ${colors.brandSoft}, ${colors.bg} 60%)`,
        }}
      >
        <BaseStyles />
        <div style={{ ...cardStyle, maxWidth: 480, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.4, color: colors.brand, fontWeight: 800 }}>
            MICROBIZ
          </div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Chưa được gán vào quán nào</h1>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Tài khoản <strong>{context.email || "này"}</strong> đã đăng nhập nhưng chưa có
            dòng <code>staff_members</code> đang hoạt động. Vui lòng liên hệ chủ quán để được
            thêm vào quán.
          </p>
          <p style={{ ...mutedStyle, margin: 0 }}>
            Nếu bạn vừa được thêm, hãy đăng xuất rồi đăng nhập lại.
          </p>
          <form action={logoutAction}>
            <button type="submit" style={buttonStyle}>
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <StoreShell
      storeName={context.storeName}
      role={context.role}
      displayName={context.displayName}
      email={context.email}
    >
      {children}
    </StoreShell>
  );
}
