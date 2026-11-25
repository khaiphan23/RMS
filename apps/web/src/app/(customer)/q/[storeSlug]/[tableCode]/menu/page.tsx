import { Menu } from "@/components/customer/menu";
import type { TableMenu, TableRoute } from "@/components/customer/types";
import { buildTablePath } from "@/lib/qr/links";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MenuPage({ params }: { params: Promise<TableRoute> }) {
  const { storeSlug, tableCode } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_table_menu", {
    p_store_slug: storeSlug,
    p_table_code: tableCode,
  });

  if (error) return <p role="alert">Không tải được thực đơn. Vui lòng thử lại.</p>;

  const menu = data as Partial<TableMenu> | null;
  if (!menu?.store_id) return <p>Quán/bàn không tồn tại hoặc đã đóng.</p>;

  return <Menu menu={menu as TableMenu} tablePath={buildTablePath(storeSlug, tableCode)} />;
}
