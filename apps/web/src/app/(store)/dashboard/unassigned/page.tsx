import { cardStyle, mutedStyle } from "@/components/store/styles";

export default function Page() {
  return (
    <div style={{ ...cardStyle, display: "grid", gap: 8 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Chưa được gán vào quán nào</h1>
      <p style={{ ...mutedStyle, margin: 0 }}>
        Tài khoản của bạn chưa có dòng staff_members đang hoạt động. Vui lòng liên hệ chủ quán.
      </p>
    </div>
  );
}
