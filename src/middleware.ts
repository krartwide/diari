import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED = ["/play", "/games", "/teams/new", "/achievements"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth =
    PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/teams/") && pathname.endsWith("/edit");

  if (!needsAuth) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (token?.sub) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/play", "/play/:path*", "/games", "/games/:path*", "/teams/new", "/teams/:path*/edit", "/achievements"],
};
