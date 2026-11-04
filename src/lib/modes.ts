import { simulateGame } from "@/lib/sim/engine";
import { newId } from "@/lib/stats";
import type { GameRecord, SeriesFormat, SeriesRecord, Team, VenueMode } from "@/lib/types";

export const SERIES_OPTIONS: {
  id: SeriesFormat;
  label: string;
  detail: string;
  awayWinsNeeded: number;
  homeWinsNeeded: number;
  maxGames: number;
}[] = [
  { id: "single", label: "단판", detail: "1경기 승부", awayWinsNeeded: 1, homeWinsNeeded: 1, maxGames: 1 },
  { id: "bo2", label: "2판 1선승", detail: "먼저 1승 · 최대 2경기", awayWinsNeeded: 1, homeWinsNeeded: 1, maxGames: 2 },
  { id: "bo3", label: "3판 2선승", detail: "먼저 2승", awayWinsNeeded: 2, homeWinsNeeded: 2, maxGames: 3 },
  { id: "bo5", label: "5판 3선승", detail: "먼저 3승 · 준플레이오프형", awayWinsNeeded: 3, homeWinsNeeded: 3, maxGames: 5 },
  { id: "bo7", label: "7판 4선승", detail: "먼저 4승 · 한국시리즈형", awayWinsNeeded: 4, homeWinsNeeded: 4, maxGames: 7 },
  {
    id: "wc",
    label: "와일드카드",
    detail: "홈 1승 / 원정 2승 · KBO 와일드카드형",
    awayWinsNeeded: 2,
    homeWinsNeeded: 1,
    maxGames: 2,
  },
];

export const INNING_OPTIONS: { id: 7 | 9; label: string; detail: string }[] = [
  { id: 9, label: "9이닝", detail: "정규 이닝" },
  { id: 7, label: "7이닝", detail: "더블헤더·단축 경기" },
];

export const VENUE_OPTIONS: { id: VenueMode; label: string; detail: string }[] = [
  { id: "fixed", label: "홈 고정", detail: "선택한 홈팀이 전 경기 후공" },
  { id: "alternate", label: "구장 교대", detail: "1·3·5… 홈 / 2·4·6… 원정 홈" },
  { id: "ks232", label: "2-3-2", detail: "한국시리즈형 홈 배분" },
];

export type MatchModeInput = {
  series?: SeriesFormat;
  homeAdvantage?: boolean;
  innings?: 7 | 9;
  venue?: VenueMode;
};

export function seriesMeta(format: SeriesFormat) {
  return SERIES_OPTIONS.find((item) => item.id === format) ?? SERIES_OPTIONS[0]!;
}

/** Which selected team bats last in game index (0-based). */
export function homeIsSelectedHome(gameIndex: number, venue: VenueMode, maxGames: number): boolean {
  if (venue === "fixed") return true;
  if (venue === "alternate") return gameIndex % 2 === 0;
  // 2-3-2 style for longer series; for shorter series fall back to alternate-ish blocks.
  if (maxGames <= 2) return true;
  if (maxGames <= 3) return gameIndex === 0;
  if (maxGames === 5) return gameIndex <= 1 || gameIndex === 4;
  // bo7: H H A A A H H
  return gameIndex <= 1 || gameIndex >= 5;
}

export function defaultVenue(format: SeriesFormat): VenueMode {
  if (format === "single" || format === "bo2" || format === "wc") return "fixed";
  if (format === "bo7") return "ks232";
  return "alternate";
}

export function simulateSeries(
  away: Team,
  home: Team,
  options: {
    ownerId: string;
    series?: SeriesFormat;
    homeAdvantage?: boolean;
    innings?: 7 | 9;
    venue?: VenueMode;
    awayStarterId?: string;
    homeStarterId?: string;
    seed?: number;
  },
): SeriesRecord {
  const format = options.series ?? "single";
  const meta = seriesMeta(format);
  const venue = options.venue ?? defaultVenue(format);
  const homeAdvantage = options.homeAdvantage ?? true;
  const innings = options.innings ?? 9;
  const seriesId = newId("series");
  const baseSeed = options.seed ?? Math.floor(Math.random() * 1_000_000_000);

  let awayWins = 0;
  let homeWins = 0;
  const games: GameRecord[] = [];

  for (let i = 0; i < meta.maxGames; i += 1) {
    if (awayWins >= meta.awayWinsNeeded || homeWins >= meta.homeWinsNeeded) break;

    const selectedHomeBatsLast = homeIsSelectedHome(i, venue, meta.maxGames);
    const top = selectedHomeBatsLast ? away : home;
    const bottom = selectedHomeBatsLast ? home : away;
    const topStarter =
      i === 0 && options.awayStarterId && top.id === away.id
        ? options.awayStarterId
        : i === 0 && options.homeStarterId && top.id === home.id
          ? options.homeStarterId
          : top.rotation[i % Math.max(top.rotation.length, 1)];
    const bottomStarter =
      i === 0 && options.homeStarterId && bottom.id === home.id
        ? options.homeStarterId
        : i === 0 && options.awayStarterId && bottom.id === away.id
          ? options.awayStarterId
          : bottom.rotation[i % Math.max(bottom.rotation.length, 1)];

    const game = simulateGame(top, bottom, {
      seed: baseSeed + i * 9973,
      awayStarterId: topStarter,
      homeStarterId: bottomStarter,
      ownerId: options.ownerId,
      id: newId("game"),
      homeAdvantage,
      regulationInnings: innings,
      seriesId,
      seriesGame: i + 1,
      seriesFormat: format,
      venue,
    });
    games.push(game);

    const topIsAwaySlot = top.id === away.id;
    if (game.linescore.awayR > game.linescore.homeR) {
      if (topIsAwaySlot) awayWins += 1;
      else homeWins += 1;
    } else if (game.linescore.homeR > game.linescore.awayR) {
      if (topIsAwaySlot) homeWins += 1;
      else awayWins += 1;
    }
  }

  const winner =
    homeWins >= meta.homeWinsNeeded ? "home" : awayWins >= meta.awayWinsNeeded ? "away" : null;
  const winnerName = winner === "away" ? away.name : winner === "home" ? home.name : null;
  const modeBits = [
    meta.label,
    homeAdvantage ? "홈 어드밴티지" : "중립",
    innings === 7 ? "7이닝" : "9이닝",
    venue === "fixed" ? "홈 고정" : venue === "ks232" ? "2-3-2 구장" : "구장 교대",
  ];
  const summary =
    winnerName != null
      ? `${modeBits.join(" · ")}. ${away.shortName} ${awayWins}–${homeWins} ${home.shortName}, ${winnerName} 승리.`
      : `${modeBits.join(" · ")}. ${away.shortName} ${awayWins}–${homeWins} ${home.shortName}.`;

  return {
    id: seriesId,
    createdAt: new Date().toISOString(),
    ownerId: options.ownerId,
    format,
    winsNeeded: Math.max(meta.awayWinsNeeded, meta.homeWinsNeeded),
    awayWinsNeeded: meta.awayWinsNeeded,
    homeWinsNeeded: meta.homeWinsNeeded,
    maxGames: meta.maxGames,
    awayWins,
    homeWins,
    winner,
    homeAdvantage,
    innings,
    venue,
    away: { id: away.id, name: away.name, shortName: away.shortName, primary: away.primary, secondary: away.secondary },
    home: { id: home.id, name: home.name, shortName: home.shortName, primary: home.primary, secondary: home.secondary },
    games,
    summary,
  };
}
