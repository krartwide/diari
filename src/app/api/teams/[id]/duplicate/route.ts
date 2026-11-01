import { NextResponse } from "next/server";
import { duplicateTeam, findTeam, userIdFrom } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const { id } = await ctx.params;
  const source = findTeam(userId, id);
  if (!source) return NextResponse.json({ error: "팀을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ team: duplicateTeam(userId, source) });
}
