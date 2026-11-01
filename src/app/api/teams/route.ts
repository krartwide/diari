import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { saveTeam, visibleTeams } from "@/lib/store";

export async function GET() {
  const userId = await requireUserId();
  if (userId) return NextResponse.json({ teams: await visibleTeams(userId), userId });
  // Anonymous: same canonical↔override merge as logged-in users (no private teams).
  return NextResponse.json({ teams: await visibleTeams("__anon__"), userId: null });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const saved = await saveTeam(userId, body);
  if ("error" in saved) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}
