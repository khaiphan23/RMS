"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ORDER_STATUS_LABELS } from "@/lib/supabase/types";
import { orderTokenKey } from "./cart-context";
import { currency, type CustomerOrder } from "./types";
import styles from "./customer.module.css";

const timeline = ["pending", "preparing", "ready", "completed"] as const;
const paymentLabels: Record<CustomerOrder["payment_status"], string> = {
  unpaid: "Chưa thanh toán",
  partial: "Đã thanh toán một phần",
  paid: "Đã thanh toán",
};

export function OrderStatusView({ tablePath, queryToken }: {
  tablePath: string;
  queryToken: string | null;
}) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let token = queryToken;
    if (token === null) {
      try {
        token = localStorage.getItem(orderTokenKey(tablePath));
      } catch {
        // The status URL is sufficient when storage is unavailable.
      }
    }
    if (!token) {
      setChecked(true);
      return;
    }

    let active = true;
    let inFlight = false;
    const orderToken = token;
    const interval = window.setInterval(() => void load(), 5000);

    async function load() {
      if (inFlight || !active) return;
      inFlight = true;
      try {
        const { data, error: rpcError } = await createBrowserSupabaseClient().rpc("get_order_status", {
          p_order_token: orderToken,
        });
        if (!active) return;
        if (rpcError) {
          setError(rpcError.message);
          return;
        }

        const result = data as CustomerOrder | null;
        setError("");
        setOrder(result);
        if (!result || result.order_status === "completed" || result.order_status === "cancelled") {
          window.clearInterval(interval);
        }
      } catch {
        if (active) setError("Không tải được trạng thái đơn. Vui lòng thử lại.");
      } finally {
        if (active) setChecked(true);
        inFlight = false;
      }
    }

    void load();
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [queryToken, tablePath, refresh]);

  const currentStep = order?.order_status === "confirmed" ? "pending" : order?.order_status;

  return (
    <>
      <Link href={`${tablePath}/menu`}>← Về thực đơn</Link>
      <h1>Trạng thái đơn</h1>
      {!checked && <p role="status">Đang tìm đơn…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {checked && !error && !order && <p>Không tìm thấy đơn.</p>}
      {order && (
        <>
          <p role="status"><strong>{ORDER_STATUS_LABELS[order.order_status]}</strong></p>
          {order.order_status !== "cancelled" && (
            <ol className={styles.timeline} aria-label="Tiến độ đơn">
              {timeline.map((step) => (
                <li key={step} aria-current={step === currentStep ? "step" : undefined}>
                  {step === "pending" && order.order_status === "confirmed"
                    ? ORDER_STATUS_LABELS.confirmed : ORDER_STATUS_LABELS[step]}
                </li>
              ))}
            </ol>
          )}
          <section className={styles.card}>
            <h2>Món đã đặt</h2>
            <ul>
              {order.items.map((item, index) => (
                <li key={index}>{item.quantity} × {item.name_snapshot} · {currency.format(item.line_total_vnd)}</li>
              ))}
            </ul>
          </section>
          <section className={styles.card}>
            <h2>Thanh toán</h2>
            <p role="status">{paymentLabels[order.payment_status]}</p>
            <dl className={styles.totals}>
              <div><dt>Tổng tiền</dt><dd>{currency.format(order.total_vnd)}</dd></div>
              <div><dt>Đã trả</dt><dd>{currency.format(order.paid_vnd)}</dd></div>
              <div><dt>Còn lại</dt><dd>{currency.format(Math.max(0, order.total_vnd - order.paid_vnd))}</dd></div>
            </dl>
          </section>
          {order.order_status === "completed" && order.payment_status !== "paid" && (
            <button className={styles.button} type="button" onClick={() => setRefresh((value) => value + 1)}>
              Cập nhật thanh toán
            </button>
          )}
        </>
      )}
    </>
  );
}
