import { redirect } from "next/navigation";
import type { TableRoute } from "@/components/customer/types";
import { buildTablePath } from "@/lib/qr/links";

export default async function OrderPage({ params, searchParams }: {
  params: Promise<TableRoute>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const [{ storeSlug, tableCode }, { token }] = await Promise.all([params, searchParams]);
  const path = `${buildTablePath(storeSlug, tableCode)}/order-status`;
  redirect(typeof token === "string" ? `${path}?token=${encodeURIComponent(token)}` : path);
}
