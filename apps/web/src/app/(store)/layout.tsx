import type { ReactNode } from "react";

// Khu quán: chỉ owner/manager/cashier/waiter/kitchen của chính quán đó (RLS store-isolation).
export default function StoreLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
