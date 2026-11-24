export function buildTablePath(storeSlug: string, tableCode: string) {
  return `/q/${encodeURIComponent(storeSlug)}/${encodeURIComponent(tableCode)}`;
}

export function buildTableUrl(storeSlug: string, tableCode: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const base =
    configured || (typeof window !== "undefined" ? window.location.origin : "");

  return `${base}${buildTablePath(storeSlug, tableCode)}`;
}
