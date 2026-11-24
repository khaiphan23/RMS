import {
  SettingsForm,
  type StoreProfileView,
} from "@/components/store/settings-form";
import { cardStyle, mutedStyle } from "@/components/store/styles";
import { Notice, PageHeader } from "@/components/store/ui";
import { requireStaff } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/permissions/roles";
import { friendlyDbError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileRow = {
  address: string | null;
  phone: string | null;
  opening_hours: unknown;
  settings: unknown;
};

type PlanRelation = { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;

type SubscriptionRow = {
  status: string;
  expires_at: string | null;
  plans: PlanRelation;
};

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trialing: "Dùng thử",
  active: "Đang hoạt động",
  past_due: "Quá hạn",
  cancelled: "Đã huỷ",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readOpeningHours(value: unknown) {
  if (typeof value === "string") return value;
  if (isRecord(value)) return readText(value.text);
  return "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value));
}

export default async function SettingsPage() {
  const staff = await requireStaff();
  const canEdit = canManageSettings(staff.role);
  const supabase = await createServerSupabaseClient();

  const profileRequest = supabase
    .from("stores_profile")
    .select("address, phone, opening_hours, settings")
    .eq("store_id", staff.storeId)
    .maybeSingle();

  const subscriptionRequest = canEdit
    ? supabase
        .from("subscriptions")
        .select("status, expires_at, plans(name, code)")
        .eq("store_id", staff.storeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [profileResult, subscriptionResult] = await Promise.all([
    profileRequest,
    subscriptionRequest,
  ]);

  if (profileResult.error) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <PageHeader title="Cài đặt quán" description={staff.storeName} />
        <Notice tone="error">{friendlyDbError(profileResult.error)}</Notice>
      </div>
    );
  }

  const profile = profileResult.data as ProfileRow | null;
  const settings = profile && isRecord(profile.settings) ? profile.settings : {};

  const initial: StoreProfileView = {
    displayName: readText(settings.display_name) || staff.storeName,
    address: readText(profile?.address),
    phone: readText(profile?.phone),
    openingHours: readOpeningHours(profile?.opening_hours),
    bankName: readText(settings.bank_name),
    bankAccountNumber: readText(settings.bank_account_number),
    bankAccountHolder: readText(settings.bank_account_holder),
  };

  const subscription = subscriptionResult.data as SubscriptionRow | null;
  const planRelation = subscription?.plans;
  const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <PageHeader
        title="Cài đặt quán"
        description={`${staff.storeName} · ${staff.storeSlug}`}
      />

      {subscriptionResult.error ? (
        <Notice tone="error">{friendlyDbError(subscriptionResult.error)}</Notice>
      ) : null}

      <div style={{ ...cardStyle, display: "grid", gap: 6 }}>
        <div>
          <strong>Tên trên hệ thống:</strong> {staff.storeName}
        </div>
        <div>
          <strong>Slug:</strong> {staff.storeSlug}
        </div>
        <div style={mutedStyle}>
          Tên hệ thống, slug và gói thuê bao do MicroBiz quản lý; không sửa ở trang này.
        </div>
      </div>

      {canEdit ? (
        <div style={{ ...cardStyle, display: "grid", gap: 6 }}>
          <div>
            <strong>Gói thuê bao:</strong>{" "}
            {subscription ? plan?.name || plan?.code || "Gói thuê bao" : "Chưa có gói thuê bao"}
          </div>
          {subscription ? (
            <>
              <div>
                <strong>Trạng thái:</strong>{" "}
                {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
              </div>
              <div>
                <strong>Hết hạn:</strong>{" "}
                {subscription.expires_at ? formatDate(subscription.expires_at) : "Không giới hạn"}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <SettingsForm initial={initial} canEdit={canEdit} />
    </div>
  );
}
