"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { recordPayment } from "@/app/(store)/dashboard/payments/actions";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/supabase/types";

import {
  buttonStyle,
  cardStyle,
  colors,
  gridStyle,
  inputStyle,
  labelStyle,
  mutedStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from "./styles";
import { EmptyState, Notice } from "./ui";

export type PaymentOrderView = {
  id: string;
  table_code: string | null;
  table_name: string | null;
  order_status: OrderStatus;
  total_vnd: number;
  paid_vnd: number;
  remaining_vnd: number;
  created_at: string;
  note: string | null;
};

export type PaymentHistoryView = {
  id: string;
  order_id: string;
  table_code: string | null;
  table_name: string | null;
  payment_status: PaymentStatus;
  method: PaymentMethod;
  amount_vnd: number;
  paid_at: string;
  note: string | null;
};

const vnd = new Intl.NumberFormat("vi-VN");

function formatVnd(value: number) {
  return `${vnd.format(value)} ₫`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function PaymentPill({ paid, remaining }: { paid: number; remaining: number }) {
  const paidEnough = remaining <= 0;
  const partial = paid > 0 && !paidEnough;

  return (
    <span
      style={{
        background: paidEnough ? colors.successSoft : partial ? "#fffaeb" : colors.dangerSoft,
        color: paidEnough ? "#067647" : partial ? "#b54708" : colors.danger,
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {paidEnough ? "Đã thanh toán" : partial ? "Thanh toán một phần" : "Chưa thanh toán"}
    </span>
  );
}

function PaymentOrderCard({
  order,
  busy,
  onSubmit,
}: {
  order: PaymentOrderView;
  busy: boolean;
  onSubmit: (orderId: string, amount: number, method: string, note: string) => void;
}) {
  const paidEnough = order.remaining_vnd <= 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const method = String(data.get("method") ?? "");
    const note = String(data.get("note") ?? "");
    onSubmit(order.id, amount, method, note);
  }

  return (
    <article style={{ ...cardStyle, display: "grid", gap: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 700 }}>
            {order.table_name
              ? `${order.table_name} (${order.table_code})`
              : order.table_code || "Không rõ bàn"}
          </div>
          <div style={mutedStyle}>
            {formatTime(order.created_at)} · {ORDER_STATUS_LABELS[order.order_status]}
          </div>
        </div>
        <PaymentPill paid={order.paid_vnd} remaining={order.remaining_vnd} />
      </div>

      <div style={gridStyle}>
        <div>
          <div style={mutedStyle}>Tổng tiền</div>
          <strong>{formatVnd(order.total_vnd)}</strong>
        </div>
        <div>
          <div style={mutedStyle}>Đã thu</div>
          <strong>{formatVnd(order.paid_vnd)}</strong>
        </div>
        <div>
          <div style={mutedStyle}>Còn lại</div>
          <strong>{formatVnd(order.remaining_vnd)}</strong>
        </div>
      </div>

      {order.note ? (
        <div
          style={{
            padding: "7px 9px",
            borderRadius: 7,
            background: colors.bg,
            fontSize: 13,
          }}
        >
          <strong>Ghi chú đơn:</strong> {order.note}
        </div>
      ) : null}

      {paidEnough ? (
        <Notice tone="success">Đơn đã thu đủ. Không có nút xoá thanh toán.</Notice>
      ) : (
        <form
          key={`${order.id}-${order.remaining_vnd}`}
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 10 }}
        >
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            <label style={labelStyle}>
              Số tiền (VND)
              <input
                style={inputStyle}
                name="amount"
                type="number"
                min={1}
                step={1}
                defaultValue={order.remaining_vnd}
                required
              />
            </label>
            <label style={labelStyle}>
              Phương thức
              <select style={inputStyle} name="method" defaultValue="cash">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Ghi chú
              <input style={inputStyle} name="note" placeholder="Không bắt buộc" />
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={busy}
              style={{
                ...buttonStyle,
                opacity: busy ? 0.55 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Ghi nhận thanh toán
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

export function PaymentsManager({
  orders,
  recentPayments,
}: {
  orders: PaymentOrderView[];
  recentPayments: PaymentHistoryView[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const openOrders = orders.filter(
    (order) => order.remaining_vnd > 0 && order.order_status !== "cancelled",
  );

  function submit(orderId: string, amount: number, method: string, note: string) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await recordPayment({
        orderId,
        amountVnd: amount,
        method,
        note,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("Đã ghi nhận thanh toán.");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Đơn cần thu ({openOrders.length})</h2>
        {openOrders.length === 0 ? (
          <EmptyState>Không còn đơn cần thu trong danh sách gần đây.</EmptyState>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {openOrders.map((order) => (
              <PaymentOrderCard
                key={order.id}
                order={order}
                busy={busy}
                onSubmit={submit}
              />
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Thanh toán gần đây</h2>
        {recentPayments.length === 0 ? (
          <EmptyState>Chưa có thanh toán nào.</EmptyState>
        ) : (
          <div style={{ ...cardStyle, overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Thời gian</th>
                  <th style={thStyle}>Bàn</th>
                  <th style={thStyle}>Phương thức</th>
                  <th style={thStyle}>Số tiền</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thStyle}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td style={tdStyle}>{formatTime(payment.paid_at)}</td>
                    <td style={tdStyle}>
                      {payment.table_name
                        ? `${payment.table_name} (${payment.table_code})`
                        : payment.table_code || "—"}
                    </td>
                    <td style={tdStyle}>{PAYMENT_METHOD_LABELS[payment.method]}</td>
                    <td style={tdStyle}>{formatVnd(payment.amount_vnd)}</td>
                    <td style={tdStyle}>{PAYMENT_STATUS_LABELS[payment.payment_status]}</td>
                    <td style={tdStyle}>{payment.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
