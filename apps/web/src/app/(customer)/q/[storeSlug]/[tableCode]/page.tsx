import { redirect } from "next/navigation";
import type { TableRoute } from "@/components/customer/types";
import { buildTablePath } from "@/lib/qr/links";

export default async function QrPage({ params }: { params: Promise<TableRoute> }) {
  const { storeSlug, tableCode } = await params;
  redirect(`${buildTablePath(storeSlug, tableCode)}/menu`);
}
