import { NextResponse } from "next/server";
import { devLoginEnabled, googleAuthEnabled } from "@/auth";

export async function GET() {
  return NextResponse.json({
    google: googleAuthEnabled(),
    devLogin: devLoginEnabled(),
  });
}
