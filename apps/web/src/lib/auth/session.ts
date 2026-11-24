import { cache } from "react";
import { redirect } from "next/navigation";

import { isStaffRole, type StaffRole } from "@/lib/permissions/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type StaffContext =
  | { kind: "anonymous" }
  | { kind: "platform_admin"; userId: string; email: string | null }
  | { kind: "unassigned"; userId: string; email: string | null }
  | {
      kind: "staff";
      userId: string;
      email: string | null;
      storeId: string;
      storeName: string;
      storeSlug: string;
      role: StaffRole;
      displayName: string | null;
    };

export const getStaffContext = cache(async (): Promise<StaffContext> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { kind: "anonymous" };

  const email = user.email ?? null;

  // Chỉ tin app_metadata (admin API ghi), không dùng user_metadata.
  if (user.app_metadata?.role === "platform_admin") {
    return { kind: "platform_admin", userId: user.id, email };
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("store_id, role, display_name")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (staffError) {
    throw new Error("Không tải được thông tin nhân viên.");
  }

  if (!staff || !isStaffRole(staff.role)) {
    return { kind: "unassigned", userId: user.id, email };
  }

  const { data: store, error: storeError } = await supabase
    .from("store_registry")
    .select("id, name, slug")
    .eq("id", staff.store_id)
    .maybeSingle();

  if (storeError || !store) {
    throw new Error("Không tải được thông tin quán.");
  }

  return {
    kind: "staff",
    userId: user.id,
    email,
    storeId: store.id,
    storeName: store.name,
    storeSlug: store.slug,
    role: staff.role,
    displayName: staff.display_name,
  };
});

export async function requireStaff() {
  const context = await getStaffContext();

  if (context.kind === "anonymous") redirect("/login");
  if (context.kind === "platform_admin") redirect("/admin");
  if (context.kind !== "staff") redirect("/dashboard/unassigned");

  return context;
}
