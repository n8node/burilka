import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

type MeResponse = { user?: { email: string; platform_role: string } };

async function requireSuperadmin() {
  const requestHeaders = await headers();
  const response = await fetch(`${process.env.INTERNAL_API_URL ?? "http://backend:8080"}/api/v1/auth/me`, { headers: { cookie: requestHeaders.get("cookie") ?? "" }, cache: "no-store" }).catch(() => null);
  if (!response?.ok) redirect("/auth/login");
  const payload = (await response.json()) as MeResponse;
  if (payload.user?.platform_role !== "superadmin") redirect("/");
  return payload.user;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperadmin();
  return <AdminShell email={user?.email ?? ""}>{children}</AdminShell>;
}