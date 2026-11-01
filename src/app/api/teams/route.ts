import { NextResponse } from "next/server";
import { saveTeam, userIdFrom, visibleTeams } from "@/lib/store";

export async function GET(request: Request) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  return NextResponse.json({ teams: visibleTeams(userId) });
}

export async function POST(request: Request) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const saved = saveTeam(userId, body);
  if ("error" in saved) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}
