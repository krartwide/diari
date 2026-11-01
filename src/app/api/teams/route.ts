import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { saveTeam, visibleTeams } from "@/lib/store";
import { canonicalTeams } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import type { Team } from "@/lib/types";

export async function GET() {
  const userId = await requireUserId();
  if (userId) return NextResponse.json({ teams: await visibleTeams(userId), userId });

  const publicRows = await prisma.storedTeam.findMany({ where: { visibility: "public" } });
  const shared = publicRows.map((row) => JSON.parse(row.payload) as Team);
  return NextResponse.json({ teams: [...canonicalTeams, ...shared], userId: null });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const saved = await saveTeam(userId, body);
  if ("error" in saved) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}
