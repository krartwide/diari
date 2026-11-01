import { NextResponse } from "next/server";
import { canEdit, findTeam, removeTeam, saveTeam, userIdFrom } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const { id } = await ctx.params;
  const team = findTeam(userId, id);
  if (!team) return NextResponse.json({ error: "팀을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ team, editable: canEdit(userId, team) });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const saved = saveTeam(userId, body, id);
  if ("error" in saved) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const { id } = await ctx.params;
  if (!removeTeam(userId, id)) return NextResponse.json({ error: "지울 수 있는 팀이 아닙니다." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
