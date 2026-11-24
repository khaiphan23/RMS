"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  buttonStyle,
  cardStyle,
  mutedStyle,
  secondaryButtonStyle,
} from "@/components/store/styles";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", padding: 24 }}>
      <div style={{ ...cardStyle, maxWidth: 480, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Không tải được dữ liệu</h1>
        <p style={{ ...mutedStyle, margin: 0 }}>
          Có thể phiên đăng nhập đã hết hạn hoặc RLS đang từ chối truy vấn. Thử lại hoặc đăng
          nhập lại.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={buttonStyle}>
            Thử lại
          </button>
          <Link href="/login" style={secondaryButtonStyle}>
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
