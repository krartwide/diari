import { NextResponse } from "next/server";

/** Login is disabled — solo local use. Keep middleware as a no-op pass-through. */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
