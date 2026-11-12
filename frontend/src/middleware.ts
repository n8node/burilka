import { NextResponse } from "next/server";

// Authentication and role checks are performed by the server page using the
// internal backend URL. Middleware must not call the public domain from inside
// the frontend container: that creates a fragile Docker hairpin dependency.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};