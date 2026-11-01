import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { findGame } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const game = await findGame(userId, id);
  if (!game) return NextResponse.json({ error: "경기를 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ game });
}
