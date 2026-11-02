import { NextResponse } from "next/server";
import { githubAuthEnabled, googleAuthEnabled, localLoginEnabled } from "@/auth";

export async function GET() {
  return NextResponse.json({
    google: googleAuthEnabled(),
    github: githubAuthEnabled(),
    local: localLoginEnabled(),
    register: true,
  });
}
