import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = await fetch(new URL("/app/api/v1/auth/me", request.url), {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) {
    return NextResponse.redirect(new URL("/app/auth/login", request.url));
  }
  const payload = await response.json().catch(() => null);
  if (payload?.user?.platform_role !== "superadmin") {
    return NextResponse.redirect(new URL("/app/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};