import { AdminForm } from "@/components/platform/admin-form";
import styles from "@/components/platform/admin.module.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { money } from "../shared";
import { savePlan } from "./actions";

type Plan = {
  id: string;
  code: string;
  name: string;
  setup_fee_vnd: number;
  monthly_fee_vnd: number;
  active: boolean;
};

function PlanForm({ plan }: { plan?: Plan }) {
  return (
    <AdminForm action={savePlan} button={plan ? "Lưu thay đổi" : "Tạo gói"} resetOnSuccess={!plan}>
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <label>Mã gói<input required name="code" maxLength={50} defaultValue={plan?.code} /></label>
      <label>Tên gói<input required name="name" maxLength={160} defaultValue={plan?.name} /></label>
      <label>Phí thiết lập (VND)
        <input required name="setup_fee_vnd" type="number" min="0" step="1" defaultValue={plan?.setup_fee_vnd ?? 0} />
      </label>
      <label>Phí hàng tháng (VND)
        <input required name="monthly_fee_vnd" type="number" min="0" step="1" defaultValue={plan?.monthly_fee_vnd ?? 0} />
      </label>
      <label><span><input name="active" type="checkbox" defaultChecked={plan?.active ?? true} /> Đang hoạt động</span></label>
    </AdminForm>
  );
}

export default async function PlansPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("plans")
    .select("id,code,name,setup_fee_vnd,monthly_fee_vnd,active").order("name");
  const plans = (data ?? []) as Plan[];

  return (
    <>
      <h1>Gói dịch vụ</h1>
      <details className={styles.panel}>
        <summary>Tạo gói dịch vụ</summary>
        <PlanForm />
      </details>
      {error && <p className={styles.error} role="alert">Không tải được gói dịch vụ.</p>}
      {!error && plans.length === 0 && <p>Chưa có gói dịch vụ.</p>}
      {plans.map((plan) => (
        <details className={styles.panel} key={plan.id}>
          <summary>{plan.name} · {plan.code} · {plan.active ? "Đang hoạt động" : "Đã tắt"}</summary>
          <p>Thiết lập {money(plan.setup_fee_vnd)} · Hàng tháng {money(plan.monthly_fee_vnd)}</p>
          <PlanForm plan={plan} />
        </details>
      ))}
    </>
  );
}
