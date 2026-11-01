import { NextResponse } from "next/server";
import { listAchievements } from "@/lib/achievements";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json({ achievements: await listAchievements(userId) });
}
