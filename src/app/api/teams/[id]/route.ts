import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canEdit, findTeam, removeTeam, saveTeam, visibleTeams } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

async function publicOrOwned(userId: string | null, id: string) {
  if (userId) return findTeam(userId, id);
  const teams = await visibleTeams("__anon__");
  return teams.find((team) => team.id === id) ?? null;
}

export async function GET(_request: Request, ctx: Ctx) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const team = await publicOrOwned(user?.id ?? null, id);
  if (!team) return NextResponse.json({ error: "팀을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({
    team,
    editable: user ? canEdit(user.id, team, user.admin) : false,
    admin: Boolean(user?.admin),
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const saved = await saveTeam(user.id, body, id, user.admin);
  if ("error" in saved) return NextResponse.json(saved, { status: 400 });
  return NextResponse.json(saved);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await removeTeam(user.id, id, user.admin))) {
    return NextResponse.json({ error: "지울 수 있는 팀이 아닙니다." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
