"use client";

import { useState, useTransition } from "react";

import { updateOrderStatus } from "@/app/(store)/dashboard/orders/actions";
import { KITCHEN_NEXT_ACTIONS, type OrderView } from "@/lib/supabase/orders";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/supabase/types";

import {
  buttonStyle,
  cardStyle,
  colors,
  gridStyle,
  mutedStyle,
} from "./styles";
import { EmptyState, Notice } from "./ui";
import { useOrderFeed } from "./use-order-feed";

const STATUS_TONES: Record<OrderStatus, { background: string; color: string }> = {
  pending: { background: "#fffaeb", color: "#b54708" },
  confirmed: { background: colors.infoSoft, color: "#175cd3" },
  preparing: { background: "#fff4ed", color: "#c4320a" },
  ready: { background: colors.successSoft, color: "#067647" },
  completed: { background: "#f2f4f7", color: "#344054" },
  cancelled: { background: colors.dangerSoft, color: colors.danger },
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

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      style={{
        ...STATUS_TONES[status],
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

function KitchenCard({
  order,
  busy,
  onChange,
}: {
  order: OrderView;
  busy: boolean;
  onChange: (orderId: string, status: OrderStatus) => void;
}) {
  const actions = KITCHEN_NEXT_ACTIONS[order.order_status] ?? [];

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
            {order.table ? `${order.table.name} (${order.table.table_code})` : "Không rõ bàn"}
          </div>
          <div style={mutedStyle}>{formatTime(order.created_at)}</div>
        </div>
        <StatusBadge status={order.order_status} />
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 5,
        }}
      >
        {order.items.map((item) => (
          <li key={item.id} style={{ fontWeight: 600 }}>
            {item.name_snapshot} × {item.quantity}
          </li>
        ))}
      </ul>

      {order.note ? (
        <div
          style={{
            padding: "7px 9px",
            borderRadius: 7,
            background: colors.bg,
            fontSize: 13,
          }}
        >
          <strong>Ghi chú:</strong> {order.note}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          borderTop: `1px solid ${colors.line}`,
          paddingTop: 9,
        }}
      >
        <span style={mutedStyle}>Tổng tiền</span>
        <strong>{formatVnd(order.total_vnd)}</strong>
      </div>

      {actions.length > 0 ? (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={busy}
              onClick={() => onChange(order.id, action.status)}
              style={{
                ...buttonStyle,
                opacity: busy ? 0.55 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function KitchenBoard({
  storeId,
  initialOrders,
}: {
  storeId: string;
  initialOrders: OrderView[];
}) {
  const { orders, error, refresh } = useOrderFeed(storeId, initialOrders);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const active = orders
    .filter(
      (order) =>
        order.order_status === "pending" || order.order_status === "preparing",
    )
    .sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  const pending = active.filter((order) => order.order_status === "pending");
  const preparing = active.filter((order) => order.order_status === "preparing");

  function changeStatus(orderId: string, status: OrderStatus) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      await refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={mutedStyle}>Tự động cập nhật mỗi 5 giây (Realtime nếu đã cấu hình).</div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {actionError ? <Notice tone="error">{actionError}</Notice> : null}

      {active.length === 0 ? (
        <EmptyState>Không có đơn đang chờ hoặc đang chuẩn bị.</EmptyState>
      ) : (
        <>
          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Chờ xử lý ({pending.length})</h2>
            {pending.length === 0 ? (
              <EmptyState>Không có đơn chờ.</EmptyState>
            ) : (
              <div style={gridStyle}>
                {pending.map((order) => (
                  <KitchenCard
                    key={order.id}
                    order={order}
                    busy={busy}
                    onChange={changeStatus}
                  />
                ))}
              </div>
            )}
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Đang chuẩn bị ({preparing.length})</h2>
            {preparing.length === 0 ? (
              <EmptyState>Không có đơn đang chuẩn bị.</EmptyState>
            ) : (
              <div style={gridStyle}>
                {preparing.map((order) => (
                  <KitchenCard
                    key={order.id}
                    order={order}
                    busy={busy}
                    onChange={changeStatus}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
