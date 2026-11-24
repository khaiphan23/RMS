export const STAFF_ROLES = ["owner", "manager", "cashier", "waiter", "kitchen"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Chủ quán",
  manager: "Quản lý",
  cashier: "Thu ngân",
  waiter: "Phục vụ",
  kitchen: "Bếp",
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

function hasRole(role: StaffRole, allowed: readonly StaffRole[]) {
  return allowed.includes(role);
}

// Ma trận bám theo RLS ở supabase/migrations/0015_roles_and_hardening.sql.
// RLS vẫn là lớp bảo vệ chính; các hàm này chỉ dùng để ẩn/hiện UI.

export function canViewMenu(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "cashier", "waiter", "kitchen"]);
}

export function canManageMenu(role: StaffRole) {
  return hasRole(role, ["owner", "manager"]);
}

export function canViewTables(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "cashier", "waiter"]);
}

export function canManageTables(role: StaffRole) {
  return hasRole(role, ["owner", "manager"]);
}

export function canViewOrders(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "cashier", "waiter", "kitchen"]);
}

export function canManageOrders(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "cashier", "waiter"]);
}

export function canUpdateOrderStatus(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "cashier", "waiter", "kitchen"]);
}

export function canViewKitchen(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "kitchen"]);
}

export function canViewPayments(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "cashier"]);
}

export function canManagePayments(role: StaffRole) {
  return hasRole(role, ["owner", "manager", "cashier"]);
}

export function canViewReports(role: StaffRole) {
  return hasRole(role, ["owner", "manager"]);
}

export function canViewStaff(role: StaffRole) {
  return hasRole(role, ["owner", "manager"]);
}

export function canManageStaff(role: StaffRole) {
  return hasRole(role, ["owner"]);
}

export function canManageStore(role: StaffRole) {
  return hasRole(role, ["owner"]);
}
