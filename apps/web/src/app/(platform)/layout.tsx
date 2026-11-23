import type { ReactNode } from "react";

// Khu platform admin: không import components/store hay lib nào đọc orders/payments/reports/staff (Q8).
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
