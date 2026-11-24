import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const { url, key } = getSupabaseEnv();
  browserClient = createBrowserClient(url, key);
  return browserClient;
}
