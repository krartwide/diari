import { NextResponse } from "next/server";
import { simulateGame } from "@/lib/sim/engine";
import { findTeam, listGames, saveGame, userIdFrom } from "@/lib/store";
import { newId, rosterIssues } from "@/lib/stats";

export async function GET(request: Request) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const games = listGames(userId).map((game) => {
    const { plays, ...rest } = game;
    return { ...rest, playCount: plays.length };
  });
  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ error: "사용자 정보가 없습니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    awayId?: string;
    homeId?: string;
    awayStarterId?: string;
    homeStarterId?: string;
  } | null;
  if (!body?.awayId || !body.homeId) return NextResponse.json({ error: "원정과 홈 팀이 필요합니다." }, { status: 400 });
  const away = findTeam(userId, body.awayId);
  const home = findTeam(userId, body.homeId);
  if (!away || !home) return NextResponse.json({ error: "팀을 찾지 못했습니다." }, { status: 404 });
  const awayIssue = rosterIssues(away)[0];
  const homeIssue = rosterIssues(home)[0];
  if (awayIssue || homeIssue) {
    return NextResponse.json({ error: `${awayIssue ? away.name : home.name}: ${awayIssue ?? homeIssue}` }, { status: 400 });
  }
  const game = simulateGame(away, home, {
    awayStarterId: body.awayStarterId,
    homeStarterId: body.homeStarterId,
    ownerId: userId,
    id: newId("game"),
  });
  saveGame(game);
  return NextResponse.json({ game });
}
