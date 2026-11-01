import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { canEdit, findTeam, removeTeam, saveTeam, canonicalTeams } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import type { Team } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function publicOrOwned(userId: string | null, id: string) {
  if (userId) return findTeam(userId, id);
  const canonical = canonicalTeams.find((team) => team.id === id);
  if (canonical) return canonical;
  const row = await prisma.storedTeam.findFirst({ where: { id, visibility: "public" } });
  return row ? (JSON.parse(row.payload) as Team) : null;
}

export async function GET(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  const team = await publicOrOwned(userId, id);
  if (!team) return NextResponse.json({ error: "팀을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ team, editable: userId ? canEdit(userId, team) : false });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const saved = await saveTeam(userId, body, id);
  if ("error" in saved) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await removeTeam(userId, id))) return NextResponse.json({ error: "지울 수 있는 팀이 아닙니다." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
