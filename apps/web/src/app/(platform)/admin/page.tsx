import Link from "next/link";
import styles from "@/components/platform/admin.module.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { storeLabels, storeStatuses } from "./shared";

const dayMs = 86400000;

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const deadline = new Date(now.getTime() + 30 * dayMs);
  const [storeCounts, active, expiring, unpaid] = await Promise.all([
    Promise.all(storeStatuses.map((status) =>
      supabase.from("store_registry").select("id", { head: true, count: "exact" }).eq("status", status),
    )),
    supabase.from("subscriptions").select("id", { head: true, count: "exact" }).eq("status", "active"),
    supabase.from("subscriptions").select("id", { head: true, count: "exact" })
      .in("status", ["active", "trialing"]).gte("expires_at", now.toISOString()).lte("expires_at", deadline.toISOString()),
    supabase.from("subscription_invoices").select("id", { head: true, count: "exact" }).eq("status", "issued"),
  ]);
  const failed = [...storeCounts, active, expiring, unpaid].some((result) => result.error);

  return (
    <>
      <h1>Tổng quan nền tảng</h1>
      {failed && <p className={styles.error} role="alert">Một số chỉ số không tải được.</p>}
      <section>
        <h2>Cửa hàng</h2>
        <dl className={styles.grid}>
          {storeStatuses.map((status, index) => (
            <div className={styles.panel} key={status}>
              <dt>{storeLabels[status]}</dt><dd>{storeCounts[index].count ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <Link href="/admin/stores">Quản lý cửa hàng</Link>
      </section>
      <section>
        <h2>Thuê bao và hoá đơn</h2>
        <dl className={styles.grid}>
          <div className={styles.panel}><dt>Thuê bao đang hoạt động</dt><dd>{active.count ?? "—"}</dd></div>
          <div className={styles.panel}><dt>Thuê bao hết hạn trong 30 ngày</dt><dd>{expiring.count ?? "—"}</dd></div>
          <div className={styles.panel}><dt>Hoá đơn đã phát hành, chưa thu</dt><dd>{unpaid.count ?? "—"}</dd></div>
        </dl>
        <Link href="/admin/subscriptions">Xem thuê bao và hoá đơn</Link>
      </section>
    </>
  );
}
