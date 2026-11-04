import { NextResponse } from "next/server";
import { defaultVenue, seriesMeta, simulateSeries } from "@/lib/modes";
import { requireUserId } from "@/lib/session";
import { findTeam, listGames, saveGame } from "@/lib/store";
import { rosterIssues } from "@/lib/stats";
import type { SeriesFormat, VenueMode } from "@/lib/types";

const SERIES_IDS = new Set<SeriesFormat>(["single", "bo2", "bo3", "bo5", "bo7", "wc"]);
const VENUE_IDS = new Set<VenueMode>(["fixed", "alternate", "ks232"]);

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const games = (await listGames(userId)).map((game) => {
    const { plays, ...rest } = game;
    return { ...rest, playCount: plays.length };
  });
  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다. 경기를 시작하려면 먼저 로그인하세요." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    awayId?: string;
    homeId?: string;
    awayStarterId?: string;
    homeStarterId?: string;
    series?: SeriesFormat;
    homeAdvantage?: boolean;
    innings?: 7 | 9;
    venue?: VenueMode;
  } | null;
  if (!body?.awayId || !body.homeId) return NextResponse.json({ error: "원정과 홈 팀이 필요합니다." }, { status: 400 });
  const away = await findTeam(userId, body.awayId);
  const home = await findTeam(userId, body.homeId);
  if (!away || !home) return NextResponse.json({ error: "팀을 찾지 못했습니다." }, { status: 404 });
  const awayIssue = rosterIssues(away)[0];
  const homeIssue = rosterIssues(home)[0];
  if (awayIssue || homeIssue) {
    return NextResponse.json({ error: `${awayIssue ? away.name : home.name}: ${awayIssue ?? homeIssue}` }, { status: 400 });
  }

  const series = body.series && SERIES_IDS.has(body.series) ? body.series : "single";
  const innings = body.innings === 7 ? 7 : 9;
  const homeAdvantage = body.homeAdvantage !== false;
  const venue = body.venue && VENUE_IDS.has(body.venue) ? body.venue : defaultVenue(series);

  const record = simulateSeries(away, home, {
    ownerId: userId,
    series,
    homeAdvantage,
    innings,
    venue,
    awayStarterId: body.awayStarterId,
    homeStarterId: body.homeStarterId,
  });

  for (const game of record.games) {
    await saveGame(game);
  }

  if (series === "single" && record.games[0]) {
    return NextResponse.json({ game: record.games[0], series: record });
  }

  return NextResponse.json({
    series: record,
    game: record.games[0] ?? null,
    meta: seriesMeta(series),
  });
}
