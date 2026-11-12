import { NextResponse, type NextRequest } from "next/server";

// The platform-admin area stays closed until authentication and server-side RBAC
// are implemented. UI-only route guards must not be treated as API authorization.
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL("/app/auth/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};