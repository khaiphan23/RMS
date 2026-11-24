import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = typeof params.next === "string" ? params.next : "/dashboard";
  const next = /^\/dashboard(?:\/|$)/.test(requested) ? requested : "/dashboard";

  return <LoginForm next={next} />;
}
