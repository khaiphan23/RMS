"use client";

import { useCallback, useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/supabase/errors";
import { fetchOrderFeed, type OrderView } from "@/lib/supabase/orders";

const POLL_MS = 5000;

export function useOrderFeed(storeId: string, initialOrders: OrderView[]) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const result = await fetchOrderFeed(supabase, storeId);

    if (result.error) {
      setError(friendlyDbError(result.error));
      return;
    }

    setOrders(result.orders);
    setError(null);
  }, [storeId]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // Realtime cần bảng nằm trong publication; nếu chưa cấu hình thì polling bên dưới vẫn chạy.
    const channel = supabase
      .channel(`order-feed-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [storeId, refresh]);

  return { orders, error, refresh };
}
