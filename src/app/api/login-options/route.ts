import { NextResponse } from "next/server";
import { googleAuthEnabled } from "@/auth";

export async function GET() {
  return NextResponse.json({
    google: googleAuthEnabled(),
  });
}
