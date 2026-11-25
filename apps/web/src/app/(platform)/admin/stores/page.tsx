import Link from "next/link";
import { AdminForm } from "@/components/platform/admin-form";
import styles from "@/components/platform/admin.module.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { displayDate, storeLabels, storeStatuses, type StoreStatus } from "../shared";
import { updateStore } from "./actions";

type Store = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  owner_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  registered_at: string;
  status: StoreStatus;
};

const pageSize = 25;

export default async function StoresPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const keyword = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, 10000) : 1;
  const start = (page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();

  let query = supabase.from("store_registry")
    .select("id,name,slug,owner_user_id,owner_name,contact_phone,contact_email,registered_at,status", { count: "exact" })
    .order("registered_at", { ascending: false }).order("id")
    .range(start, start + pageSize - 1);
  if (keyword) {
    const escaped = keyword.replace(/[\\"]/g, "\\$&");
    const pattern = `"%${escaped}%"`;
    query = query.or(["name", "slug", "owner_name", "contact_phone", "contact_email"]
      .map((field) => `${field}.ilike.${pattern}`).join(","));
  }

  const { data, error, count } = await query;
  const stores = (data ?? []) as Store[];
  const pageLink = (number: number) => `/admin/stores?${new URLSearchParams({ q: keyword, page: String(number) })}`;

  return (
    <>
      <h1>Cửa hàng</h1>
      <form method="get" className={styles.row}>
        <label htmlFor="store-search">Tìm cửa hàng</label>
        <input id="store-search" name="q" defaultValue={keyword} maxLength={120}
          placeholder="Tên, mã quán hoặc liên hệ" />
        <button type="submit">Tìm</button>
      </form>
      {error ? <p className={styles.error} role="alert">Không tải được cửa hàng.</p> : (
        <>
          {stores.length === 0 && <p>Không tìm thấy cửa hàng.</p>}
          {stores.map((store) => (
            <details className={styles.panel} key={store.id}>
              <summary>{store.name} · {storeLabels[store.status]}</summary>
              <p className={styles.muted}>Mã quán {store.slug} · Đăng ký {displayDate(store.registered_at)}</p>
              <p>{[store.owner_name, store.contact_email, store.contact_phone].filter(Boolean).join(" · ") || "Chưa có thông tin liên hệ."}</p>
              <AdminForm action={updateStore}>
                <input type="hidden" name="id" value={store.id} />
                <label>Trạng thái
                  <select name="status" defaultValue={store.status}>
                    {storeStatuses.map((status) => <option key={status} value={status}>{storeLabels[status]}</option>)}
                  </select>
                </label>
                <label>Tên chủ quán<input name="owner_name" maxLength={160} defaultValue={store.owner_name ?? ""} /></label>
                <label>ID tài khoản chủ quán (UUID)
                  <input name="owner_user_id" maxLength={36} defaultValue={store.owner_user_id ?? ""} />
                  <small>Dùng tài khoản có sẵn. Quyền vào quán được quản lý riêng.</small>
                </label>
                <label>Số điện thoại<input type="tel" name="contact_phone" maxLength={40} defaultValue={store.contact_phone ?? ""} /></label>
                <label>Email<input type="email" name="contact_email" maxLength={254} defaultValue={store.contact_email ?? ""} /></label>
              </AdminForm>
            </details>
          ))}
          {(page > 1 || (count ?? 0) > start + pageSize) && (
            <nav className={styles.row} aria-label="Trang danh sách cửa hàng">
              {page > 1 && <Link href={pageLink(page - 1)}>Trang trước</Link>}
              <span>Trang {page}</span>
              {(count ?? 0) > start + pageSize && <Link href={pageLink(page + 1)}>Trang sau</Link>}
            </nav>
          )}
        </>
      )}
    </>
  );
}
