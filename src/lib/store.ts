import canonicalRaw from "@/data/canonical-teams.json";
import { awardGameAchievements, awardPublicTeam } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { newId, outsFromInnings, recomputeBatterRates, rosterIssues } from "@/lib/stats";
import type {
  Bats,
  GameRecord,
  LineupSlot,
  PitcherLine,
  Player,
  Position,
  Team,
  Throws,
  Visibility,
} from "@/lib/types";

const POSITIONS = new Set<Position>(["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "P"]);

export const canonicalTeams = canonicalRaw as Team[];
const canonicalIds = new Set(canonicalTeams.map((team) => team.id));

function parseTeam(payload: string): Team {
  return JSON.parse(payload) as Team;
}

function parseGame(payload: string): GameRecord {
  return JSON.parse(payload) as GameRecord;
}

function withCanonicalFlag(team: Team, id: string): Team {
  if (!canonicalIds.has(id)) return team;
  return { ...team, id, canonical: true, visibility: "public" };
}

export async function visibleTeams(userId: string) {
  const rows = await prisma.storedTeam.findMany({
    where: {
      OR: [{ visibility: "public" }, { ownerId: userId }],
    },
  });
  const stored = rows.map((row) => parseTeam(row.payload));
  const byId = new Map(stored.map((team) => [team.id, team]));
  const canon = canonicalTeams.map((team) => {
    const override = byId.get(team.id);
    return override ? withCanonicalFlag(override, team.id) : team;
  });
  const others = stored.filter((team) => !canonicalIds.has(team.id));
  return [...canon, ...others];
}

export async function findTeam(userId: string, id: string) {
  const teams = await visibleTeams(userId);
  return teams.find((team) => team.id === id) ?? null;
}

export function canEdit(userId: string, team: Team, admin = false) {
  if (admin) return true;
  return !team.canonical && team.ownerId === userId;
}

function num(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function round(n: number, places: number) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

function cleanLogo(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  if (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) return null;
  if (value.length > 480_000) return null;
  return value;
}

function cleanHand(value: unknown, kind: "bats" | "throws"): Bats | Throws {
  if (kind === "bats" && (value === "L" || value === "R" || value === "S")) return value;
  if (kind === "throws" && (value === "L" || value === "R")) return value;
  return "R";
}

function cleanPlayer(raw: unknown): Player | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim().slice(0, 40);
  if (!name) return null;
  const kind = row.kind === "P" ? "P" : "B";
  const positions = Array.isArray(row.positions)
    ? row.positions.filter((pos): pos is Position => typeof pos === "string" && POSITIONS.has(pos as Position))
    : [];
  const player: Player = {
    id: typeof row.id === "string" && row.id.length < 80 ? row.id : newId("pl"),
    name,
    kind,
    bats: cleanHand(row.bats, "bats") as Bats,
    throws: cleanHand(row.throws, "throws") as Throws,
    positions: positions.length ? positions : [kind === "P" ? "P" : "DH"],
  };
  if (kind === "P") {
    const src = (row.pitcher ?? {}) as Record<string, unknown>;
    const ip = Math.max(0, num(src.ip));
    const line: PitcherLine = {
      g: Math.max(0, Math.round(num(src.g))),
      w: Math.max(0, Math.round(num(src.w))),
      l: Math.max(0, Math.round(num(src.l))),
      sv: Math.max(0, Math.round(num(src.sv))),
      hld: Math.max(0, Math.round(num(src.hld))),
      ip,
      era: round(num(src.era), 2),
      h: Math.max(0, Math.round(num(src.h))),
      hr: Math.max(0, Math.round(num(src.hr))),
      bb: Math.max(0, Math.round(num(src.bb))),
      hbp: Math.max(0, Math.round(num(src.hbp))),
      so: Math.max(0, Math.round(num(src.so))),
      whip: round(num(src.whip), 2),
      swar: round(num(src.swar), 2),
      // Peak fastball (km/h). The pitch sim usually sits a few below this.
      speed: Math.round(Math.min(175, Math.max(90, num(src.speed, 145)))),
      er: src.er == null || src.er === "" ? undefined : Math.max(0, Math.round(num(src.er))),
      r: src.r == null || src.r === "" ? undefined : Math.max(0, Math.round(num(src.r))),
    };
    if (line.whip === 0 && line.ip > 0) {
      const innings = outsFromInnings(line.ip) / 3;
      if (innings) line.whip = round((line.h + line.bb) / innings, 2);
    }
    player.pitcher = line;
    player.positions = ["P"];
  } else {
    const src = (row.batter ?? {}) as Record<string, unknown>;
    let line = {
      g: Math.max(0, Math.round(num(src.g))),
      ab: Math.max(0, Math.round(num(src.ab))),
      h: Math.max(0, Math.round(num(src.h))),
      doubles: Math.max(0, Math.round(num(src.doubles))),
      triples: Math.max(0, Math.round(num(src.triples))),
      hr: Math.max(0, Math.round(num(src.hr))),
      rbi: Math.max(0, Math.round(num(src.rbi))),
      r: Math.max(0, Math.round(num(src.r))),
      sb: Math.max(0, Math.round(num(src.sb))),
      bb: Math.max(0, Math.round(num(src.bb))),
      so: Math.max(0, Math.round(num(src.so))),
      avg: round(num(src.avg), 3),
      obp: round(num(src.obp), 3),
      slg: round(num(src.slg), 3),
      ops: round(num(src.ops), 3),
      wrcPlus: Math.round(num(src.wrcPlus, 100)),
      swar: round(num(src.swar), 2),
      speed: Math.round(Math.min(99, Math.max(1, num(src.speed, 50)))),
      pa: Math.max(0, Math.round(num(src.pa))),
      hbp: Math.max(0, Math.round(num(src.hbp))),
      sf: Math.max(0, Math.round(num(src.sf))),
      sac: Math.max(0, Math.round(num(src.sac))),
      cs: Math.max(0, Math.round(num(src.cs))),
    };
    const computed = recomputeBatterRates(line);
    if (!line.avg && line.ab) line = { ...line, avg: computed.avg };
    if (!line.obp && line.ab) line = { ...line, obp: computed.obp };
    if (!line.slg && line.ab) line = { ...line, slg: computed.slg };
    if (!line.ops && line.ab) line = { ...line, ops: computed.ops };
    player.batter = line;
  }
  return player;
}

export function sanitizeTeam(
  raw: unknown,
  userId: string,
  existing?: Team,
  options?: { keepCanonical?: boolean },
): { team: Team } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "팀 정보가 비어 있습니다." };
  const row = raw as Record<string, unknown>;
  const players = Array.isArray(row.players) ? row.players.map(cleanPlayer).filter((p): p is Player => Boolean(p)) : [];
  const ids = new Set(players.map((player) => player.id));
  const lineup: LineupSlot[] = [];
  if (Array.isArray(row.lineup)) {
    for (const slot of row.lineup) {
      if (!slot || typeof slot !== "object") continue;
      const item = slot as Record<string, unknown>;
      const playerId = String(item.playerId ?? "");
      const position = item.position as Position;
      if (!ids.has(playerId) || !POSITIONS.has(position) || position === "P") continue;
      if (lineup.some((taken) => taken.playerId === playerId)) continue;
      lineup.push({ playerId, position });
    }
  }
  const pickIds = (key: string, kind: "B" | "P") => {
    if (!Array.isArray(row[key])) return [];
    const out: string[] = [];
    for (const id of row[key] as unknown[]) {
      if (typeof id !== "string" || !ids.has(id) || out.includes(id)) continue;
      const player = players.find((item) => item.id === id);
      if (!player || player.kind !== kind) continue;
      if (kind === "B" && lineup.some((slot) => slot.playerId === id)) continue;
      out.push(id);
    }
    return out;
  };
  const keepCanonical = Boolean(options?.keepCanonical || existing?.canonical || (existing && canonicalIds.has(existing.id)));
  const team: Team = {
    id: existing?.id ?? newId("team"),
    name: String(row.name ?? "").trim().slice(0, 40),
    shortName: String(row.shortName ?? "").trim().slice(0, 8) || String(row.name ?? "").trim().slice(0, 4),
    year: row.year == null || row.year === "" ? null : Math.round(num(row.year)),
    primary: /^#[0-9a-fA-F]{6}$/.test(String(row.primary ?? "")) ? String(row.primary) : "#14352B",
    secondary: /^#[0-9a-fA-F]{6}$/.test(String(row.secondary ?? "")) ? String(row.secondary) : "#E4B15A",
    logo: cleanLogo(row.logo),
    visibility: keepCanonical ? "public" : row.visibility === "public" ? "public" : "private",
    ownerId: keepCanonical ? existing?.ownerId ?? userId : userId,
    canonical: keepCanonical,
    blurb: String(row.blurb ?? "").trim().slice(0, 400),
    lineup: lineup.slice(0, 9),
    rotation: pickIds("rotation", "P").slice(0, 8),
    bullpen: [],
    closers: [],
    bench: pickIds("bench", "B").slice(0, 14),
    players,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  team.closers = pickIds("closers", "P")
    .filter((id) => !team.rotation.includes(id))
    .slice(0, 3);
  team.bullpen = pickIds("bullpen", "P")
    .filter((id) => !team.rotation.includes(id) && !team.closers.includes(id))
    .slice(0, 14);
  const issues = rosterIssues(team);
  if (issues.length) return { error: issues[0]! };
  return { team };
}

export async function saveTeam(userId: string, raw: unknown, id?: string, admin = false) {
  const existingRow = id ? await prisma.storedTeam.findFirst({ where: { id } }) : null;
  const baseCanon = id ? canonicalTeams.find((team) => team.id === id) : undefined;

  if (id) {
    const ownsRow = existingRow?.ownerId === userId;
    const adminCanon = admin && Boolean(baseCanon || existingRow);
    const adminAny = admin && Boolean(existingRow);
    if (!ownsRow && !adminCanon && !adminAny) {
      return { error: "고칠 수 있는 팀이 아닙니다." } as const;
    }
  }

  const existing = existingRow
    ? withCanonicalFlag(parseTeam(existingRow.payload), existingRow.id)
    : baseCanon;
  const keepCanonical = Boolean(baseCanon || existing?.canonical);
  if (!admin && keepCanonical) return { error: "공개 기록 구단은 관리자만 고칠 수 있습니다." } as const;

  const cleaned = sanitizeTeam(raw, userId, existing, { keepCanonical });
  if ("error" in cleaned) return cleaned;

  // Admin edits of history clubs keep the stable public id.
  if (keepCanonical && id) cleaned.team.id = id;
  cleaned.team.ownerId = keepCanonical ? userId : cleaned.team.ownerId;

  await prisma.storedTeam.upsert({
    where: { id: cleaned.team.id },
    create: {
      id: cleaned.team.id,
      ownerId: userId,
      visibility: cleaned.team.visibility,
      payload: JSON.stringify(cleaned.team),
    },
    update: {
      // Keep the editing admin as steward of the public override.
      ownerId: admin && keepCanonical ? userId : undefined,
      visibility: cleaned.team.visibility,
      payload: JSON.stringify(cleaned.team),
    },
  });
  if (cleaned.team.visibility === "public" && !cleaned.team.canonical) await awardPublicTeam(userId);
  return { team: cleaned.team };
}

export async function removeTeam(userId: string, id: string, admin = false) {
  if (canonicalIds.has(id)) {
    if (!admin) return false;
    // Clearing an admin override restores the bundled JSON roster.
    const result = await prisma.storedTeam.deleteMany({ where: { id } });
    return result.count > 0;
  }
  if (admin) {
    const result = await prisma.storedTeam.deleteMany({ where: { id } });
    return result.count > 0;
  }
  const result = await prisma.storedTeam.deleteMany({ where: { id, ownerId: userId } });
  return result.count > 0;
}

export async function duplicateTeam(userId: string, source: Team) {
  const map = new Map<string, string>();
  const players = source.players.map((player) => {
    const nextId = newId("pl");
    map.set(player.id, nextId);
    return { ...player, id: nextId, sourceId: player.sourceId ?? player.id };
  });
  const team: Team = {
    ...source,
    id: newId("team"),
    name: `${source.name} 사본`.slice(0, 40),
    players,
    lineup: source.lineup.map((slot) => ({ ...slot, playerId: map.get(slot.playerId) ?? slot.playerId })),
    rotation: source.rotation.map((id) => map.get(id) ?? id),
    bullpen: source.bullpen.map((id) => map.get(id) ?? id),
    closers: (source.closers ?? []).map((id) => map.get(id) ?? id),
    bench: source.bench.map((id) => map.get(id) ?? id),
    logo: source.logo,
    visibility: "private" satisfies Visibility,
    ownerId: userId,
    canonical: false,
    createdAt: new Date().toISOString(),
  };
  await prisma.storedTeam.create({
    data: {
      id: team.id,
      ownerId: userId,
      visibility: team.visibility,
      payload: JSON.stringify(team),
    },
  });
  return team;
}

export async function listGames(userId: string) {
  const rows = await prisma.storedGame.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => parseGame(row.payload));
}

export async function findGame(userId: string, id: string) {
  const row = await prisma.storedGame.findFirst({ where: { id, ownerId: userId } });
  return row ? parseGame(row.payload) : null;
}

export async function saveGame(game: GameRecord) {
  await prisma.storedGame.create({
    data: {
      id: game.id,
      ownerId: game.ownerId,
      summary: game.summary.slice(0, 240),
      payload: JSON.stringify(game),
      createdAt: new Date(game.createdAt),
    },
  });
  const count = await prisma.storedGame.count({ where: { ownerId: game.ownerId } });
  if (count > 120) {
    const old = await prisma.storedGame.findMany({
      where: { ownerId: game.ownerId },
      orderBy: { createdAt: "asc" },
      take: count - 120,
      select: { id: true },
    });
    if (old.length) {
      await prisma.storedGame.deleteMany({ where: { id: { in: old.map((row) => row.id) } } });
    }
  }
  await awardGameAchievements(game.ownerId, game);
  return game;
}
