"use client";

import { use } from "react";
import { OrderStatusView } from "@/components/customer/order-status";
import type { TableRoute } from "@/components/customer/types";
import { buildTablePath } from "@/lib/qr/links";

export default function OrderStatusPage({ params, searchParams }: {
  params: Promise<TableRoute>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { storeSlug, tableCode } = use(params);
  const { token } = use(searchParams);
  const path = buildTablePath(storeSlug, tableCode);
  const queryToken = typeof token === "string" ? token : token === undefined ? null : "";

  return <OrderStatusView key={JSON.stringify([path, queryToken])} tablePath={path} queryToken={queryToken} />;
}
