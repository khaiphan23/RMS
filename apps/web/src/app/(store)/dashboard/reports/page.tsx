import {
  cardStyle,
  colors,
  gridStyle,
  mutedStyle,
  pageStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from "@/components/store/styles";
import { EmptyState, Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import { canViewReports } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_status: OrderStatus;
  created_at: string;
};

type PaymentRow = {
  amount_vnd: number;
  paid_at: string;
};

type ItemRow = {
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  quantity: number;
  line_total_vnd: number;
};

const vnd = new Intl.NumberFormat("vi-VN");
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatVnd(value: number) {
  return `${vnd.format(value)} ₫`;
}

function vnDateKey(value: string | Date) {
  return dateKeyFormatter.format(typeof value === "string" ? new Date(value) : value);
}

function formatDateLabel(key: string) {
  return dateLabelFormatter.format(new Date(`${key}T00:00:00+07:00`));
}

export default async function ReportsPage() {
  const staff = await requireStaff();

  if (!canViewReports(staff.role)) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Báo cáo" description={staff.storeName} />
        <Notice tone="error">Bạn không có quyền xem báo cáo.</Notice>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const now = new Date();
  // A-05: 30 ngày lịch theo giờ Việt Nam, bắt đầu từ 00:00 ngày đầu tiên.
  const dayKeys = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now.getTime() - (29 - index) * 24 * 60 * 60 * 1000);
    return vnDateKey(date);
  });
  const startIso = new Date(`${dayKeys[0]}T00:00:00+07:00`).toISOString();

  const [ordersResult, paymentsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_status, created_at")
      .eq("store_id", staff.storeId)
      .gte("created_at", startIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("amount_vnd, paid_at")
      .eq("store_id", staff.storeId)
      .eq("payment_status", "paid")
      .gte("paid_at", startIso)
      .order("paid_at", { ascending: true }),
  ]);

  const error = ordersResult.error ?? paymentsResult.error;
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Báo cáo" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const orders = (ordersResult.data ?? []) as OrderRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  // Doanh thu theo tiền đã thu, kể cả đơn sau đó bị huỷ; hoàn tiền phải ghi refunded.
  const validOrders = orders.filter((order) => order.order_status !== "cancelled");
  const validOrderIds = new Set(validOrders.map((order) => order.id));

  const { data: itemData, error: itemError } = await supabase
    .from("order_items")
    .select("order_id, menu_item_id, name_snapshot, quantity, line_total_vnd")
    .eq("store_id", staff.storeId)
    .gte("created_at", startIso)
    .limit(5000);

  if (itemError) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Báo cáo" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(itemError)}</Notice>
      </div>
    );
  }

  // shortcut: tổng hợp ở server component, đủ cho 30 ngày của quán nhỏ; chuyển sang RPC khi dữ liệu lớn.
  const items = ((itemData ?? []) as ItemRow[]).filter((item) =>
    validOrderIds.has(item.order_id),
  );

  const revenueByDay = new Map(dayKeys.map((key) => [key, 0]));
  const ordersByDay = new Map(dayKeys.map((key) => [key, 0]));

  for (const payment of payments) {
    const key = vnDateKey(payment.paid_at);
    if (revenueByDay.has(key)) {
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + payment.amount_vnd);
    }
  }

  for (const order of validOrders) {
    const key = vnDateKey(order.created_at);
    if (ordersByDay.has(key)) {
      ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
    }
  }

  const days = [...dayKeys].reverse().map((key) => ({
    key,
    label: formatDateLabel(key),
    revenue: revenueByDay.get(key) ?? 0,
    orders: ordersByDay.get(key) ?? 0,
  }));

  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const item of items) {
    const current = itemMap.get(item.menu_item_id) ?? {
      name: item.name_snapshot,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += item.quantity;
    current.revenue += item.line_total_vnd;
    itemMap.set(item.menu_item_id, current);
  }

  const topItems = [...itemMap.entries()]
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount_vnd, 0);
  const totalOrders = validOrders.length;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Báo cáo"
        description={`${staff.storeName} · 30 ngày gần nhất`}
      />

      <Notice tone="info">
        Doanh thu tính từ payments đã thu, kể cả đơn sau đó bị huỷ; số đơn và món bán
        chạy không gồm đơn đã huỷ. Hoàn tiền phải ghi refunded để giảm doanh thu.
      </Notice>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={mutedStyle}>Doanh thu 30 ngày</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{formatVnd(totalRevenue)}</div>
        </div>
        <div style={cardStyle}>
          <div style={mutedStyle}>Số đơn</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{totalOrders}</div>
        </div>
        <div style={cardStyle}>
          <div style={mutedStyle}>Món bán chạy nhất</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {topItems[0] ? `${topItems[0].name} (${topItems[0].quantity})` : "Chưa có dữ liệu"}
          </div>
        </div>
      </div>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Doanh thu theo ngày</h2>
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Ngày</th>
                <th style={thStyle}>Số đơn</th>
                <th style={thStyle}>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.key}>
                  <td style={tdStyle}>{day.label}</td>
                  <td style={tdStyle}>{day.orders}</td>
                  <td style={{ ...tdStyle, fontWeight: day.revenue > 0 ? 700 : 400 }}>
                    {formatVnd(day.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>5 món bán chạy</h2>
        {topItems.length === 0 ? (
          <EmptyState>Chưa có món nào trong 30 ngày gần nhất.</EmptyState>
        ) : (
          <div style={{ ...cardStyle, overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Món</th>
                  <th style={thStyle}>Số lượng</th>
                  <th style={thStyle}>Doanh thu món</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.name}</td>
                    <td style={tdStyle}>{item.quantity}</td>
                    <td style={tdStyle}>{formatVnd(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ ...cardStyle, ...mutedStyle, color: colors.muted }}>
        Báo cáo được tính trực tiếp từ orders, order_items và payments của quán; không ghi
        sang bảng tổng hợp.
      </div>
    </div>
  );
}
