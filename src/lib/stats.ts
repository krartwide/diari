import type { BatterLine, PitcherLine, Player, Position, Team } from "@/lib/types";

export const POSITIONS: Position[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

export const POSITION_LABEL: Record<Position, string> = {
  C: "포수",
  "1B": "1루수",
  "2B": "2루수",
  "3B": "3루수",
  SS: "유격수",
  LF: "좌익수",
  CF: "중견수",
  RF: "우익수",
  DH: "지명타자",
  P: "투수",
};

export function fmtAvg(n: number) {
  if (!Number.isFinite(n)) return "–";
  return n.toFixed(3);
}

export function fmtRate(n: number) {
  if (!Number.isFinite(n)) return "–";
  return n.toFixed(2);
}

export function fmtIp(outs: number) {
  const whole = Math.floor(outs / 3);
  const rem = outs % 3;
  return rem === 0 ? String(whole) : `${whole}.${rem}`;
}

export function outsFromInnings(ip: number) {
  return Math.max(0, Math.round(ip * 3));
}

export function displayInnings(ip: number) {
  return fmtIp(outsFromInnings(ip));
}

/** 타율·출루·장타·OPS는 소수점 없이 285를 넣으면 0.285. */
export function parseAvg(raw: string): number | null {
  return parseFixed(raw, 3);
}

/** ERA·WHIP·sWAR는 325를 넣으면 3.25. sWAR는 두 자리 이하면 그대로 둔다. */
export function parseRate2(raw: string): number | null {
  return parseFixed(raw, 2);
}

export function parseSwar(raw: string): number | null {
  const t = raw.trim();
  if (!t || t === "-" || t === "." || t === "-.") return null;
  if (t.includes(".")) {
    const n = Number(t);
    return Number.isFinite(n) ? roundTo(n, 2) : null;
  }
  if (!/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  if (Math.abs(n) >= 100) return roundTo(n / 100, 2);
  return roundTo(n, 2);
}

export function parseIp(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const frac = t.match(/^(\d+)\s+(\d)\s*\/\s*(\d+)$/);
  if (frac) {
    const den = Number(frac[3]);
    if (!den) return null;
    return Number(frac[1]) + Number(frac[2]) / den;
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [head, dec] = t.split(".");
  if (dec === "1" || dec === "2") return Number(head) + (dec === "1" ? 1 / 3 : 2 / 3);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseFixed(raw: string, places: 2 | 3): number | null {
  const t = raw.trim();
  if (!t || t === ".") return null;
  if (t.includes(".")) {
    const n = Number(t);
    return Number.isFinite(n) ? roundTo(n, places) : null;
  }
  if (!/^\d+$/.test(t)) return null;
  const div = places === 3 ? 1000 : 100;
  return roundTo(Number(t) / div, places);
}

function roundTo(n: number, places: number) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

export function plateAppearances(b: BatterLine) {
  if (b.pa && b.pa > 0) return b.pa;
  return b.ab + b.bb + (b.hbp ?? 0) + (b.sf ?? 0) + (b.sac ?? 0);
}

export function recomputeBatterRates(b: BatterLine): BatterLine {
  const next = { ...b };
  const ab = Math.max(0, b.ab);
  const h = Math.max(0, b.h);
  const doubles = Math.max(0, b.doubles);
  const triples = Math.max(0, b.triples);
  const hr = Math.max(0, b.hr);
  const bb = Math.max(0, b.bb);
  const hbp = Math.max(0, b.hbp ?? 0);
  const sf = Math.max(0, b.sf ?? 0);
  const tb = h + doubles + 2 * triples + 3 * hr;
  next.avg = ab ? roundTo(h / ab, 3) : 0;
  next.slg = ab ? roundTo(tb / ab, 3) : 0;
  const den = ab + bb + hbp + sf;
  next.obp = den ? roundTo((h + bb + hbp) / den, 3) : 0;
  next.ops = roundTo(next.obp + next.slg, 3);
  return next;
}

export function recomputePitcherRates(p: PitcherLine): PitcherLine {
  const next = { ...p };
  const outs = outsFromInnings(p.ip);
  const ip = outs / 3;
  next.whip = ip ? roundTo((p.h + p.bb) / ip, 2) : 0;
  if (p.er != null && ip) next.era = roundTo((p.er / ip) * 9, 2);
  return next;
}

export function playerById(team: Team, id: string) {
  return team.players.find((player) => player.id === id);
}

export function batterOf(player: Player): BatterLine {
  return (
    player.batter ?? {
      g: 0,
      ab: 0,
      h: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      r: 0,
      sb: 0,
      bb: 0,
      so: 0,
      avg: 0,
      obp: 0,
      slg: 0,
      ops: 0,
      wrcPlus: 100,
      swar: 0,
      speed: 50,
    }
  );
}

export function pitcherOf(player: Player): PitcherLine {
  return (
    player.pitcher ?? {
      g: 1,
      w: 0,
      l: 0,
      sv: 0,
      hld: 0,
      ip: 1,
      era: 4.5,
      h: 1,
      hr: 0,
      bb: 0,
      hbp: 0,
      so: 1,
      whip: 1.3,
      swar: 0,
      speed: 145,
    }
  );
}

export function handLabel(bats: string, throws: string) {
  const t = throws === "L" ? "좌투" : "우투";
  const b = bats === "L" ? "좌타" : bats === "S" ? "양타" : "우타";
  return `${t}${b}`;
}

export function contrastText(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#111111";
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq > 150 ? "#161616" : "#f7f3ea";
}

export function newId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function blankBatter(name = ""): Player {
  return {
    id: newId("pl"),
    name,
    kind: "B",
    bats: "R",
    throws: "R",
    positions: ["DH"],
    batter: {
      g: 0,
      ab: 0,
      h: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      r: 0,
      sb: 0,
      bb: 0,
      so: 0,
      avg: 0,
      obp: 0,
      slg: 0,
      ops: 0,
      wrcPlus: 100,
      swar: 0,
      speed: 50,
      pa: 0,
      hbp: 0,
      sf: 0,
      cs: 0,
    },
  };
}

export function blankPitcher(name = ""): Player {
  return {
    id: newId("pl"),
    name,
    kind: "P",
    bats: "R",
    throws: "R",
    positions: ["P"],
    pitcher: {
      g: 0,
      w: 0,
      l: 0,
      sv: 0,
      hld: 0,
      ip: 0,
      era: 0,
      h: 0,
      hr: 0,
      bb: 0,
      hbp: 0,
      so: 0,
      whip: 0,
      swar: 0,
      speed: 145,
      er: 0,
      r: 0,
    },
  };
}

export function emptyTeam(ownerId: string): Team {
  return {
    id: newId("team"),
    name: "",
    shortName: "",
    year: null,
    primary: "#14352B",
    secondary: "#E4B15A",
    logo: null,
    visibility: "private",
    ownerId,
    canonical: false,
    blurb: "",
    lineup: [],
    rotation: [],
    bullpen: [],
    closers: [],
    bench: [],
    players: [],
    createdAt: new Date().toISOString(),
  };
}

export function rosterIssues(team: Team) {
  const issues: string[] = [];
  if (!team.name.trim()) issues.push("팀 이름이 필요합니다.");
  if (team.lineup.length !== 9) issues.push("타순은 9명이어야 합니다.");
  if (team.rotation.length < 1) issues.push("선발 투수가 한 명은 있어야 합니다.");
  const ids = new Set(team.players.map((p) => p.id));
  for (const slot of team.lineup) {
    if (!ids.has(slot.playerId)) issues.push("라인업에 없는 선수가 있습니다.");
  }
  return issues;
}
