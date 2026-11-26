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

export const dynamic = "force-dynamic";

type Report = {
  days: { key: string; revenue: number; orders: number }[];
  top_items: { id: string; name: string; quantity: number; revenue: number }[];
};

const vnd = new Intl.NumberFormat("vi-VN");
const dateLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatVnd(value: number) {
  return `${vnd.format(value)} ₫`;
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
  const { data, error } = await supabase.rpc("get_store_report", {
    p_store_id: staff.storeId,
  });
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Báo cáo" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(error)}</Notice>
      </div>
    );
  }

  const { days, top_items: topItems } = data as Report;
  const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const totalOrders = days.reduce((sum, day) => sum + day.orders, 0);

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Báo cáo"
        description={`${staff.storeName} · 30 ngày gần nhất`}
      />

      <Notice tone="info">
        Doanh thu tính từ payments trạng thái paid; số đơn và món bán chạy không gồm đơn
        đã huỷ.
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
                  <td style={tdStyle}>{formatDateLabel(day.key)}</td>
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
