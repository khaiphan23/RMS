import Link from "next/link";
import { AdminForm } from "@/components/platform/admin-form";
import styles from "@/components/platform/admin.module.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { displayDate, localDateTime, money, subscriptionLabels, subscriptionStatuses, type SubscriptionStatus } from "../shared";
import { saveSubscription } from "./actions";

type StoreOption = { id: string; name: string; slug: string };
type PlanOption = { id: string; name: string; active: boolean };
type Subscription = {
  id: string;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  store_registry: { name: string } | null;
  plans: { name: string } | null;
};

const invoiceLabels = { draft: "Bản nháp", issued: "Đã phát hành", paid: "Đã thu", void: "Đã huỷ" };
const pageSize = 25;

function SubscriptionForm({ stores, plans, subscription }: {
  stores: StoreOption[];
  plans: PlanOption[];
  subscription?: Subscription;
}) {
  const availablePlans = plans.filter((plan) => plan.active || plan.id === subscription?.plan_id);

  return (
    <AdminForm action={saveSubscription} button={subscription ? "Lưu thay đổi" : "Gán gói cho quán"}
      resetOnSuccess={!subscription}>
      {subscription ? <input type="hidden" name="id" value={subscription.id} /> : (
        <label>Cửa hàng
          <select name="store_id" required defaultValue="">
            <option value="" disabled>Chọn cửa hàng</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.slug})</option>)}
          </select>
        </label>
      )}
      <label>Gói dịch vụ
        <select name="plan_id" required defaultValue={subscription?.plan_id ?? ""}>
          <option value="" disabled>Chọn gói dịch vụ</option>
          {availablePlans.map((plan) => (
            <option key={plan.id} value={plan.id}>{plan.name}{plan.active ? "" : " (đã tắt)"}</option>
          ))}
        </select>
      </label>
      <label>Trạng thái
        <select name="status" defaultValue={subscription?.status ?? "active"}>
          {subscriptionStatuses.map((status) => <option key={status} value={status}>{subscriptionLabels[status]}</option>)}
        </select>
      </label>
      <label>Hết hạn (giờ Việt Nam)
        <input name="expires_at" type="datetime-local" step="1" defaultValue={localDateTime(subscription?.expires_at ?? null)} />
      </label>
    </AdminForm>
  );
}

export default async function SubscriptionsPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = Number((await searchParams).page);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 10000) : 1;
  const start = (page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  const [stores, plans, subscriptions, invoices] = await Promise.all([
    supabase.from("store_registry").select("id,name,slug").order("name"),
    supabase.from("plans").select("id,name,active").order("name"),
    supabase.from("subscriptions")
      .select("id,plan_id,status,started_at,expires_at,store_registry(name),plans(name)", { count: "exact" })
      .order("started_at", { ascending: false }).order("id").range(start, start + pageSize - 1),
    supabase.from("subscription_invoices")
      .select("id,amount_vnd,status,period_start,period_end,store_registry(name)")
      .order("created_at", { ascending: false }).limit(25),
  ]);

  const storeOptions = (stores.data ?? []) as StoreOption[];
  const planOptions = (plans.data ?? []) as PlanOption[];
  const rows = (subscriptions.data ?? []) as unknown as Subscription[];
  const invoiceRows = (invoices.data ?? []) as unknown as {
    id: string; amount_vnd: number; status: keyof typeof invoiceLabels;
    period_start: string; period_end: string; store_registry: { name: string } | null;
  }[];

  return (
    <>
      <h1>Thuê bao</h1>
      {stores.error || plans.error
        ? <p className={styles.error} role="alert">Không tải được danh sách cửa hàng hoặc gói dịch vụ.</p>
        : <details className={styles.panel}>
            <summary>Gán gói cho cửa hàng</summary>
            {storeOptions.length && planOptions.some((plan) => plan.active)
              ? <SubscriptionForm stores={storeOptions} plans={planOptions} />
              : <p>Cần có cửa hàng và gói đang hoạt động để gán thuê bao.</p>}
          </details>}
      {subscriptions.error && <p className={styles.error} role="alert">Không tải được thuê bao.</p>}
      {!subscriptions.error && rows.length === 0 && <p>Chưa có thuê bao trên trang này.</p>}
      {rows.map((subscription) => (
        <details className={styles.panel} key={subscription.id}>
          <summary>{subscription.store_registry?.name ?? "Cửa hàng"} · {subscription.plans?.name ?? "Gói dịch vụ"} · {subscriptionLabels[subscription.status]}</summary>
          <p>Bắt đầu {displayDate(subscription.started_at)} · Hết hạn {displayDate(subscription.expires_at)}</p>
          {!plans.error && <SubscriptionForm stores={storeOptions} plans={planOptions} subscription={subscription} />}
        </details>
      ))}
      {(page > 1 || (subscriptions.count ?? 0) > start + pageSize) && (
        <nav className={styles.row} aria-label="Trang danh sách thuê bao">
          {page > 1 && <Link href={`/admin/subscriptions?page=${page - 1}`}>Trang trước</Link>}
          <span>Trang {page}</span>
          {(subscriptions.count ?? 0) > start + pageSize && <Link href={`/admin/subscriptions?page=${page + 1}`}>Trang sau</Link>}
        </nav>
      )}
      <section>
        <h2>Hoá đơn thuê bao gần đây</h2>
        {invoices.error ? <p className={styles.error} role="alert">Không tải được hoá đơn.</p>
          : invoiceRows.length === 0 ? <p>Chưa có hoá đơn thuê bao.</p> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Cửa hàng</th><th>Kỳ thu</th><th>Số tiền</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {invoiceRows.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.store_registry?.name ?? "—"}</td>
                      <td>{displayDate(invoice.period_start)} – {displayDate(invoice.period_end)}</td>
                      <td>{money(invoice.amount_vnd)}</td>
                      <td>{invoiceLabels[invoice.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </>
  );
}
