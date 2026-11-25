"use client";

import { use } from "react";
import { Cart } from "@/components/customer/cart";
import type { TableRoute } from "@/components/customer/types";

export default function CartPage({ params }: { params: Promise<TableRoute> }) {
  return <Cart {...use(params)} />;
}
