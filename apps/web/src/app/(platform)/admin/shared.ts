export const storeStatuses = ["active", "suspended", "closed"] as const;
export type StoreStatus = (typeof storeStatuses)[number];
export const storeLabels: Record<StoreStatus, string> = {
  active: "Đang hoạt động",
  suspended: "Tạm ngưng",
  closed: "Đã đóng",
};

export const subscriptionStatuses = ["trialing", "active", "past_due", "cancelled"] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export const subscriptionLabels: Record<SubscriptionStatus, string> = {
  trialing: "Dùng thử",
  active: "Đang hoạt động",
  past_due: "Quá hạn",
  cancelled: "Đã huỷ",
};

const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const dateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function money(value: number) {
  return vnd.format(value);
}

export function displayDate(value: string | null) {
  return value ? date.format(new Date(value)) : "—";
}

export function localDateTime(value: string | null) {
  return value ? dateTime.format(new Date(value)).replace(" ", "T") : "";
}
