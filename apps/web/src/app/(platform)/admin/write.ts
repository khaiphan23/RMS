import "server-only";

import { getStaffContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/supabase/types";

export async function platformWriter() {
  const context = await getStaffContext();
  return context.kind === "platform_admin" ? createAdminClient() : null;
}

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

export function formText(data: FormData, field: string) {
  const value = data.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
