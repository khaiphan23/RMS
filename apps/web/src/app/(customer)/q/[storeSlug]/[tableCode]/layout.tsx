import type { ReactNode } from "react";
import { CartProvider } from "@/components/customer/cart-context";
import type { TableRoute } from "@/components/customer/types";
import { buildTablePath } from "@/lib/qr/links";
import styles from "@/components/customer/customer.module.css";

export default async function CustomerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<TableRoute>;
}) {
  const { storeSlug, tableCode } = await params;
  const path = buildTablePath(storeSlug, tableCode);
  return (
    <CartProvider key={path} tablePath={path}>
      <main className={styles.shell}>{children}</main>
    </CartProvider>
  );
}
