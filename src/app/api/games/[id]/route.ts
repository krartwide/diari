import { NextResponse } from "next/server";
import { findGame, userIdFrom } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const { id } = await ctx.params;
  const game = findGame(userId, id);
  if (!game) return NextResponse.json({ error: "경기를 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ game });
}
