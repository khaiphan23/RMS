"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  buttonStyle,
  cardStyle,
  colors,
  inputStyle,
  labelStyle,
  mutedStyle,
} from "@/components/store/styles";
import { Notice } from "@/components/store/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setPending(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !auth.user) {
        setError("Email hoặc mật khẩu không đúng.");
        setPending(false);
        return;
      }

      if (auth.user.app_metadata?.role === "platform_admin") {
        window.location.assign("/admin");
        return;
      }

      // Tra staff_members ngay sau đăng nhập; dashboard dùng lại getStaffContext().
      const { data: staff, error: staffError } = await supabase
        .from("staff_members")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (staffError) {
        setError("Đã đăng nhập nhưng chưa tải được quyền. Vui lòng thử lại.");
        setPending(false);
        return;
      }

      // Điều hướng full-page để middleware và server component đọc cookie mới.
      window.location.assign(staff ? next : "/dashboard/unassigned");
    } catch {
      setError("Không kết nối được Supabase. Kiểm tra mạng rồi thử lại.");
      setPending(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.6, color: colors.brand, fontWeight: 800 }}>
          MICROBIZ
        </div>
        <h1 style={{ margin: "6px 0 4px", fontSize: 28 }}>Đăng nhập quán</h1>
        <p style={{ ...mutedStyle, margin: 0 }}>Dùng tài khoản nhân viên để vào bảng điều khiển.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ ...cardStyle, display: "grid", gap: 14 }}>
        <label style={labelStyle}>
          Email
          <input
            style={inputStyle}
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="owner@example.com"
          />
        </label>

        <label style={labelStyle}>
          Mật khẩu
          <input
            style={inputStyle}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </label>

        {error ? <Notice tone="error">{error}</Notice> : null}

        <button type="submit" style={buttonStyle} disabled={pending}>
          {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p style={{ ...mutedStyle, margin: 0 }}>
          Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}
