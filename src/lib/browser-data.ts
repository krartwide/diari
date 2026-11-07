"use client";

import canonicalRaw from "@/data/canonical-teams.json";
import { ACHIEVEMENT_CATALOG, type AchievementKey } from "@/lib/achievement-catalog";
import { idbDelete, idbGet, idbGetAll, idbPut } from "@/lib/browser-db";
import { newId, rosterIssues } from "@/lib/stats";
import type { GameRecord, SeriesFormat, SeriesRecord, Team, VenueMode } from "@/lib/types";

export const LOCAL_OWNER_ID = "browser-solo";
export const LOCAL_OWNER_NAME = "다이아리";

const canonicalTeams = canonicalRaw as Team[];
const GAME_CAP = 120;

type LocalAchievement = { key: string; earnedAt: string };
type LocalMeta = { key: string; value: string };

function withCanonicalFlag(team: Team): Team {
  return { ...team, canonical: true, visibility: "public", ownerId: null };
}

function mergeTeams(stored: Team[]): Team[] {
  const byId = new Map(stored.map((team) => [team.id, team]));
  const canon = canonicalTeams.map((team) => {
    const override = byId.get(team.id);
    return override ? { ...override, canonical: true } : withCanonicalFlag(team);
  });
  const custom = stored.filter((team) => !canonicalTeams.some((item) => item.id === team.id));
  return [...canon, ...custom];
}

/** Bundled clubs only — safe to call during first paint without IndexedDB. */
export function listBundledTeams(): Team[] {
  return mergeTeams([]);
}

export async function listLocalTeams(): Promise<Team[]> {
  let stored: Team[] = [];
  try {
    stored = await idbGetAll<Team>("teams");
  } catch {
    // IndexedDB unavailable — still show bundled canonical clubs.
  }
  return mergeTeams(stored);
}

export async function findLocalTeam(id: string): Promise<Team | null> {
  const teams = await listLocalTeams();
  return teams.find((team) => team.id === id) ?? null;
}

export async function saveLocalTeam(team: Team) {
  const payload: Team = {
    ...team,
    name: team.name.trim(),
    ownerId: LOCAL_OWNER_ID,
  };
  await idbPut("teams", payload);
  if (team.visibility === "public" && !team.canonical) {
    await grantLocalAchievement("public_team");
  }
  return payload;
}

export async function deleteLocalTeam(id: string) {
  const existing = await idbGet<Team>("teams", id);
  if (!existing) {
    // Canonical with no override — nothing to delete.
    const isCanon = canonicalTeams.some((team) => team.id === id);
    return isCanon;
  }
  await idbDelete("teams", id);
  return true;
}

export async function duplicateLocalTeam(id: string) {
  const team = await findLocalTeam(id);
  if (!team) throw new Error("팀을 찾지 못했습니다.");
  const copy: Team = {
    ...structuredClone(team),
    id: newId("team"),
    name: `${team.name} 복제`,
    canonical: false,
    visibility: "private",
    ownerId: LOCAL_OWNER_ID,
    createdAt: new Date().toISOString(),
  };
  await saveLocalTeam(copy);
  return copy;
}

export async function listLocalGames(): Promise<GameRecord[]> {
  const games = await idbGetAll<GameRecord>("games");
  return games.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findLocalGame(id: string): Promise<GameRecord | null> {
  return idbGet<GameRecord>("games", id);
}

export async function saveLocalGame(game: GameRecord) {
  const payload = { ...game, ownerId: LOCAL_OWNER_ID };
  await idbPut("games", payload);
  const games = await listLocalGames();
  if (games.length > GAME_CAP) {
    const overflow = games.slice(GAME_CAP);
    for (const old of overflow) await idbDelete("games", old.id);
  }
  await awardLocalGameAchievements(payload);
  return payload;
}

export async function playLocalSeries(input: {
  awayId: string;
  homeId: string;
  awayStarterId?: string;
  homeStarterId?: string;
  series?: SeriesFormat;
  homeAdvantage?: boolean;
  innings?: 7 | 9;
  venue?: VenueMode;
}): Promise<SeriesRecord> {
  const away = await findLocalTeam(input.awayId);
  const home = await findLocalTeam(input.homeId);
  if (!away || !home) throw new Error("팀을 찾지 못했습니다.");
  const awayIssue = rosterIssues(away)[0];
  const homeIssue = rosterIssues(home)[0];
  if (awayIssue || homeIssue) {
    throw new Error(`${awayIssue ? away.name : home.name}: ${awayIssue ?? homeIssue}`);
  }
  const { simulateSeries } = await import("@/lib/modes");
  const record = simulateSeries(away, home, {
    ownerId: LOCAL_OWNER_ID,
    series: input.series,
    homeAdvantage: input.homeAdvantage,
    innings: input.innings,
    venue: input.venue,
    awayStarterId: input.awayStarterId,
    homeStarterId: input.homeStarterId,
  });
  for (const game of record.games) {
    await saveLocalGame(game);
  }
  return record;
}

async function grantLocalAchievement(key: AchievementKey) {
  const existing = await idbGet<LocalAchievement>("achievements", key);
  if (existing) return;
  await idbPut("achievements", { key, earnedAt: new Date().toISOString() });
}

async function awardLocalGameAchievements(game: GameRecord) {
  const games = await listLocalGames();
  await grantLocalAchievement("first_game");
  if (game.linescore.awayR !== game.linescore.homeR) await grantLocalAchievement("first_win");
  if (game.walkOff) await grantLocalAchievement("walkoff");
  if (game.completeGame?.shutout) await grantLocalAchievement("shutout");
  if (game.completeGame) await grantLocalAchievement("complete_game");
  if (Math.max(game.linescore.away.length, game.linescore.home.length) >= 10) await grantLocalAchievement("extras");
  if (game.decisions.save) await grantLocalAchievement("save");
  if (games.length >= 10) await grantLocalAchievement("ten_games");
}

export async function listLocalAchievements() {
  const earned = await idbGetAll<LocalAchievement>("achievements");
  const map = new Map(earned.map((row) => [row.key, row.earnedAt]));
  return ACHIEVEMENT_CATALOG.map((item) => ({
    ...item,
    earnedAt: map.get(item.key) ?? null,
  }));
}

/** One-time copy from the live server API into IndexedDB when local store is empty. */
export async function hydrateFromServerIfEmpty() {
  if (typeof window === "undefined") return;
  const flag = await idbGet<LocalMeta>("meta", "hydrated");
  if (flag?.value === "1") return;
  const localGames = await listLocalGames();
  const localTeams = await idbGetAll<Team>("teams");
  if (localGames.length > 0 || localTeams.length > 0) {
    await idbPut("meta", { key: "hydrated", value: "1" });
    return;
  }
  try {
    const [gamesRes, teamsRes, achRes] = await Promise.all([
      fetch("/api/games", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/teams", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/achievements", { credentials: "same-origin", cache: "no-store" }),
    ]);
    if (gamesRes.ok) {
      const data = (await gamesRes.json()) as { games?: { id: string }[] };
      for (const card of data.games ?? []) {
        if (!card.id) continue;
        const full = await fetch(`/api/games/${card.id}`, { credentials: "same-origin", cache: "no-store" });
        if (full.ok) {
          const body = (await full.json()) as { game: GameRecord };
          await idbPut("games", { ...body.game, ownerId: LOCAL_OWNER_ID });
        }
      }
    }
    if (teamsRes.ok) {
      const data = (await teamsRes.json()) as { teams?: Team[] };
      for (const team of data.teams ?? []) {
        if (!team.canonical) await idbPut("teams", { ...team, ownerId: LOCAL_OWNER_ID });
      }
    }
    if (achRes.ok) {
      const data = (await achRes.json()) as { achievements?: { key: string; earnedAt: string | null }[] };
      for (const row of data.achievements ?? []) {
        if (row.earnedAt) await idbPut("achievements", { key: row.key, earnedAt: row.earnedAt });
      }
    }
  } catch {
    // Server may be down — local-only mode is fine.
  }
  await idbPut("meta", { key: "hydrated", value: "1" });
}
