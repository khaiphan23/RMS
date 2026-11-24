import type { ReactNode } from "react";

import { BaseStyles } from "@/components/store/ui";
import { colors } from "@/components/store/styles";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: `radial-gradient(circle at top left, ${colors.brandSoft}, ${colors.bg} 55%)`,
      }}
    >
      <BaseStyles />
      {children}
    </div>
  );
}
