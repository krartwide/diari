import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { duplicateTeam, findTeam } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const source = await findTeam(userId, id);
  if (!source) return NextResponse.json({ error: "팀을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ team: await duplicateTeam(userId, source) });
}
