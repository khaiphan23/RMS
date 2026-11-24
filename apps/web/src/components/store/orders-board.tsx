"use client";

import { useState, useTransition } from "react";

import { updateOrderStatus } from "@/app/(store)/dashboard/orders/actions";
import { ORDER_NEXT_ACTIONS, type OrderView } from "@/lib/supabase/orders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/supabase/types";

import {
  buttonStyle,
  cardStyle,
  colors,
  dangerButtonStyle,
  mutedStyle,
  secondaryButtonStyle,
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

function OrderCard({
  order,
  canUpdate,
  busy,
  onChange,
}: {
  order: OrderView;
  canUpdate: boolean;
  busy: boolean;
  onChange: (orderId: string, status: OrderStatus) => void;
}) {
  const actions = canUpdate ? (ORDER_NEXT_ACTIONS[order.order_status] ?? []) : [];

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

      {order.items.length > 0 ? (
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
            <li
              key={item.id}
              style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
            >
              <span>
                {item.name_snapshot} × {item.quantity}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>{formatVnd(item.line_total_vnd)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={mutedStyle}>Đơn chưa có món.</div>
      )}

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
                ...(action.tone === "danger" ? dangerButtonStyle : buttonStyle),
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

export function OrdersBoard({
  storeId,
  initialOrders,
  canUpdate,
}: {
  storeId: string;
  initialOrders: OrderView[];
  canUpdate: boolean;
}) {
  const { orders, error, refresh } = useOrderFeed(storeId, initialOrders);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const filtered =
    filter === "all" ? orders : orders.filter((order) => order.order_status === filter);

  function countFor(status: OrderStatus) {
    return orders.filter((order) => order.order_status === status).length;
  }

  function changeStatus(orderId: string, status: OrderStatus) {
    const order = orders.find((item) => item.id === orderId);
    if (
      status === "cancelled" &&
      !window.confirm(`Huỷ đơn của ${order?.table?.name ?? "bàn này"}?`)
    ) {
      return;
    }

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
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        <button
          type="button"
          onClick={() => setFilter("all")}
          style={{
            ...(filter === "all" ? buttonStyle : secondaryButtonStyle),
            whiteSpace: "nowrap",
          }}
        >
          Tất cả ({orders.length})
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            style={{
              ...(filter === status ? buttonStyle : secondaryButtonStyle),
              whiteSpace: "nowrap",
            }}
          >
            {ORDER_STATUS_LABELS[status]} ({countFor(status)})
          </button>
        ))}
      </div>

      <div style={mutedStyle}>Tự động cập nhật mỗi 5 giây (Realtime nếu đã cấu hình).</div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {actionError ? <Notice tone="error">{actionError}</Notice> : null}

      {filtered.length === 0 ? (
        <EmptyState>
          {orders.length === 0
            ? "Quán chưa có đơn nào. Đơn mới sẽ tự hiện ở đây."
            : "Không có đơn ở trạng thái này."}
        </EmptyState>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              canUpdate={canUpdate}
              busy={busy}
              onChange={changeStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
