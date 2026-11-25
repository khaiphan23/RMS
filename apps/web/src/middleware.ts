import { type NextRequest } from "next/server";

import { redirectWithSession, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, user, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

    return redirectWithSession(url, response);
  }

  const isAdmin = user.app_metadata?.role === "platform_admin";
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminPath) {
    if (isAdmin) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithSession(url, response);
  }

  if (isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";

    return redirectWithSession(url, response);
  }

  if (pathname !== "/dashboard/unassigned") {
    const { data: staff, error } = await supabase
      .from("staff_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (!error && !staff) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/unassigned";
      url.search = "";

      return redirectWithSession(url, response);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
