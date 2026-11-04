import { batterOf, fmtIp, outsFromInnings, pitcherOf } from "@/lib/stats";
import type {
  Bats,
  BatterLine,
  BoxBatter,
  BoxPitcher,
  GameModeInfo,
  GameRecord,
  Half,
  PitchCall,
  PitcherLine,
  PitchEvent,
  PlateAppearance,
  Player,
  Position,
  Team,
} from "@/lib/types";

type Rng = () => number;

type Runner = {
  id: string;
  name: string;
  speed: number;
  pitcherId: string;
  earned: boolean;
};

type Side = 0 | 1;

type App = {
  playerId: string;
  name: string;
  side: Side;
  role: "SP" | "RP";
  limit: number;
  outs: number;
  bf: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  hbp: number;
  pitches: number;
  runsThisInning: number;
  enteredInning: number;
  enteredLead: number;
  enteredRunners: number;
  saveSit: boolean;
  isCloser: boolean;
  outsWhenEntered: number;
  removedWithLead: boolean | null;
  emergency: boolean;
};

type BatLine = {
  playerId: string;
  name: string;
  position: string;
  side: Side;
  order: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  hbp: number;
};

const PITCH_NAME: Record<string, string> = {
  ff: "포심 패스트볼",
  ft: "투심 패스트볼",
  si: "싱커",
  ct: "커터",
  sl: "슬라이더",
  cb: "커브",
  ch: "체인지업",
  sp: "스플리터",
  fo: "포크볼",
};

const PITCH_OFF: Record<string, number> = {
  ff: 0,
  ft: -3,
  si: -4,
  ct: -6,
  sl: -9,
  cb: -16,
  ch: -12,
  sp: -8,
  fo: -10,
};

const SIGNATURE: Record<string, string[]> = {
  선동열: ["ff", "fo", "sl"],
  오승환: ["ff", "sl", "cb"],
  류현진: ["ff", "ch", "cb", "sl"],
  김광현: ["ff", "sl", "ch"],
  정대현: ["si", "sl", "ft"],
  고영표: ["ch", "si", "cb", "ff"],
  유희관: ["si", "ch", "cb"],
  양현종: ["ff", "sl", "ch"],
  구창모: ["ff", "sl", "ch"],
  폰트: ["ff", "sl", "ch"],
  밴헤켄: ["ff", "sp", "sl"],
  니퍼트: ["ft", "sl", "ch"],
  장명부: ["si", "cb", "ch", "ff"],
  임창용: ["ff", "sp", "sl"],
  한기주: ["ff", "sl"],
  김재윤: ["ff", "sl", "fo"],
  위재영: ["ff", "sl"],
  구대성: ["ff", "sl", "ch"],
  송진우: ["ff", "fo", "cb"],
  정민태: ["ff", "sl", "cb"],
  정민철: ["ff", "sl", "cb"],
  밴덴헐크: ["ff", "sl", "ch"],
  데스파이네: ["ff", "ch", "sl"],
  쿠에바스: ["ff", "cb", "ch"],
  소형준: ["ff", "sl", "ch"],
  배제성: ["ff", "sl", "si"],
  루친스키: ["ff", "sl", "ch"],
  헥터: ["ff", "sl", "ch"],
  조계현: ["ff", "sl", "cb"],
  이강철: ["ff", "sl", "fo"],
  염종석: ["ff", "sl", "cb"],
  김상진: ["sl", "ff", "cb"],
  윤석민: ["ff", "sl", "ch"],
  봉중근: ["ff", "sl", "ch"],
  장원삼: ["ff", "ch", "cb"],
  권혁: ["ff", "sl", "ch"],
};

const CALL_LABEL: Record<PitchCall, string> = {
  ball: "볼",
  called_strike: "스트라이크",
  swinging_strike: "스윙 스트라이크",
  foul: "파울",
  in_play: "인플레이",
  hbp: "몸에 맞는 볼",
};

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function pick<T>(rng: Rng, list: T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function log5(batter: number, pitcher: number, league: number) {
  const b = clamp(batter, 0.004, 0.85);
  const p = clamp(pitcher, 0.004, 0.85);
  const l = clamp(league, 0.004, 0.85);
  const odds = (b / (1 - b)) * (p / (1 - p)) / (l / (1 - l));
  return odds / (1 + odds);
}

function leagueOf(year: number | null) {
  const y = year ?? 2016;
  // 타석당 비율. 안타는 타율이 아니라 타석당 안타다.
  if (y < 1990) return { k: 0.11, bb: 0.08, hbp: 0.008, hr: 0.016, h: 0.232 };
  if (y < 2000) return { k: 0.135, bb: 0.088, hbp: 0.01, hr: 0.02, h: 0.236 };
  if (y < 2010) return { k: 0.15, bb: 0.086, hbp: 0.011, hr: 0.021, h: 0.232 };
  if (y < 2016) return { k: 0.165, bb: 0.09, hbp: 0.012, hr: 0.024, h: 0.238 };
  if (y < 2020) return { k: 0.178, bb: 0.09, hbp: 0.013, hr: 0.028, h: 0.236 };
  return { k: 0.188, bb: 0.094, hbp: 0.012, hr: 0.022, h: 0.226 };
}

function blendLeague(a: number | null, b: number | null) {
  const la = leagueOf(a);
  const lb = leagueOf(b);
  return {
    k: (la.k + lb.k) / 2,
    bb: (la.bb + lb.bb) / 2,
    hbp: (la.hbp + lb.hbp) / 2,
    hr: (la.hr + lb.hr) / 2,
    h: (la.h + lb.h) / 2,
  };
}

type Rates = {
  k: number;
  bb: number;
  hbp: number;
  hr: number;
  single: number;
  double: number;
  triple: number;
  go: number;
  fo: number;
  lo: number;
};

function batterProfile(b: BatterLine) {
  const pa = Math.max(1, b.pa && b.pa > 0 ? b.pa : b.ab + b.bb + (b.hbp ?? 0) + (b.sf ?? 0) + (b.sac ?? 0));
  const hbp = b.hbp ?? estimateHbp(b);
  const hits = b.h;
  const singles = Math.max(0, hits - b.doubles - b.triples - b.hr);
  const safeHits = Math.max(hits, 1);
  return {
    pa,
    k: b.ab > 0 || b.so > 0 ? b.so / pa : 0.18,
    bb: b.bb / pa,
    hbp: hbp / pa,
    hr: b.hr / pa,
    h: hits / pa,
    singleShare: hits ? singles / safeHits : 0.7,
    doubleShare: hits ? b.doubles / safeHits : 0.22,
    tripleShare: hits ? b.triples / safeHits : 0.03,
    speed: b.speed || 50,
    sb: b.sb,
    cs: b.cs ?? Math.round(b.sb * 0.35),
  };
}

function estimateHbp(b: BatterLine) {
  if (b.hbp != null) return b.hbp;
  const ab = b.ab;
  const bb = b.bb;
  const obp = b.obp;
  if (!obp || obp >= 0.95) return Math.round(ab * 0.01);
  const hbp = (obp * (ab + bb) - b.h - bb) / (1 - obp);
  return clamp(Math.round(hbp), 0, Math.round(ab * 0.08));
}

function pitcherProfile(p: PitcherLine) {
  const outs = Math.max(1, outsFromInnings(p.ip));
  const ip = outs / 3;
  const tbf = Math.max(1, outs + p.h + p.bb + p.hbp);
  return {
    k: p.so / tbf,
    bb: p.bb / tbf,
    hbp: p.hbp / tbf,
    hr: p.hr / tbf,
    h: p.h / tbf,
    ipg: ip / Math.max(p.g, 1),
    speed: p.speed || 142,
    sv: p.sv,
    hld: p.hld,
    swar: p.swar,
    era: p.era,
  };
}

function matchup(batter: BatterLine, pitcher: PitcherLine, years: [number | null, number | null]): Rates {
  const b = batterProfile(batter);
  const p = pitcherProfile(pitcher);
  const lg = blendLeague(years[0], years[1]);
  let k = log5(b.k, p.k, lg.k);
  let bb = log5(b.bb, p.bb, lg.bb);
  let hbp = log5(Math.max(b.hbp, 0.004), Math.max(p.hbp, 0.004), lg.hbp);
  let hr = log5(Math.max(b.hr, 0.004), Math.max(p.hr, 0.004), lg.hr);
  const bHit = Math.max(0.01, b.h - b.hr);
  const pHit = Math.max(0.01, p.h - p.hr);
  let xb = log5(bHit, pHit, Math.max(0.05, lg.h - lg.hr));
  let sum = k + bb + hbp + hr + xb;
  if (sum > 0.9) {
    const scale = 0.9 / sum;
    k *= scale;
    bb *= scale;
    hbp *= scale;
    hr *= scale;
    xb *= scale;
    sum = 0.9;
  }
  const single = xb * b.singleShare;
  const dbl = xb * b.doubleShare;
  const tpl = xb * b.tripleShare;
  const outs = Math.max(0.05, 1 - (k + bb + hbp + hr + single + dbl + tpl));
  const gb =
    clamp(0.46 + (0.02 - b.hr) * 2.2 - (b.speed - 55) / 500 + (0.02 - p.hr) * 1.4, 0.3, 0.68);
  return {
    k,
    bb,
    hbp,
    hr,
    single,
    double: dbl,
    triple: tpl,
    go: outs * gb,
    fo: outs * (1 - gb) * 0.78,
    lo: outs * (1 - gb) * 0.22,
  };
}

type ResultCode = "K" | "BB" | "HBP" | "1B" | "2B" | "3B" | "HR" | "GO" | "FO" | "LO" | "E";

function sampleResult(rates: Rates, rng: Rng): ResultCode {
  const table: [ResultCode, number][] = [
    ["K", rates.k],
    ["BB", rates.bb],
    ["HBP", rates.hbp],
    ["HR", rates.hr],
    ["1B", rates.single],
    ["2B", rates.double],
    ["3B", rates.triple],
    ["GO", rates.go],
    ["FO", rates.fo],
    ["LO", rates.lo],
  ];
  let roll = rng();
  for (const [code, p] of table) {
    roll -= p;
    if (roll <= 0) return code;
  }
  return "GO";
}

function repertoire(player: Player) {
  if (SIGNATURE[player.name]) return SIGNATURE[player.name]!;
  const p = pitcherOf(player);
  const ip = Math.max(0.1, p.ip);
  const k9 = (p.so / ip) * 9;
  const hr9 = (p.hr / ip) * 9;
  if (hr9 < 0.55) return ["si", "sl", "ch", "ff"];
  if (k9 >= 9) return ["ff", "sl", "sp", "cb"];
  if (k9 < 5.5) return ["ft", "cb", "ch", "si"];
  if (player.throws === "L") return ["ff", "ch", "sl", "cb"];
  return ["ff", "sl", "ch", "cb"];
}

function choosePitch(rep: string[], balls: number, strikes: number, rng: Rng) {
  if (strikes === 2 && rng() < 0.6) {
    const put = rep.filter((code) => code !== "ff" && code !== "ft");
    if (put.length) return pick(rng, put);
  }
  if (balls > strikes && rng() < 0.62) return rep[0]!;
  return pick(rng, rep);
}

function locate(call: PitchCall, bats: Bats, rng: Rng) {
  const inside = bats === "L" ? -1 : 1;
  if (call === "hbp") return { x: inside * (0.82 + rng() * 0.2), y: 0.38 + rng() * 0.28 };
  if (call === "ball") {
    const edge = rng();
    if (edge < 0.4) return { x: inside * (0.58 + rng() * 0.4), y: 0.22 + rng() * 0.55 };
    if (edge < 0.75) return { x: -inside * (0.58 + rng() * 0.42), y: 0.2 + rng() * 0.6 };
    if (edge < 0.88) return { x: rng() * 1.1 - 0.55, y: 0.8 + rng() * 0.18 };
    return { x: rng() * 1.1 - 0.55, y: rng() * 0.18 };
  }
  const chase = call === "swinging_strike" && rng() < 0.28;
  if (chase) return { x: -inside * (0.5 + rng() * 0.25), y: 0.18 + rng() * 0.25 };
  return { x: rng() * 0.86 - 0.43, y: 0.34 + rng() * 0.34 };
}

function locationLabel(x: number, y: number, bats: Bats) {
  const inside = bats === "L" ? x < -0.18 : x > 0.18;
  const away = bats === "L" ? x > 0.18 : x < -0.18;
  const horiz = !inside && !away ? "한가운데" : inside ? "몸쪽" : "바깥쪽";
  const vert = y > 0.64 ? "높은" : y < 0.4 ? "낮은" : "중간 높이";
  return `${vert} ${horiz}`;
}

function sprayAngle(bats: Bats, result: ResultCode, rng: Rng) {
  const pull = bats === "L" ? 1 : bats === "S" && rng() < 0.45 ? 1 : bats === "S" ? -1 : -1;
  const power = result === "HR" || result === "2B" || result === "3B";
  const towardPull = rng() < (power ? 0.72 : 0.58);
  const mag = power ? 6 + rng() * 26 : rng() * 38;
  let angle = towardPull ? pull * mag : rng() < 0.5 ? -pull * mag * 0.65 : rng() * 18 - 9;
  if (result === "3B") angle = pull * (12 + rng() * 10);
  if (result === "GO") angle = (rng() * 70 - 35) * 0.8;
  return clamp(angle, -44, 44);
}

function directionOf(angle: number, distance: number) {
  if (distance < 18 && Math.abs(angle) < 12) return "투수 앞";
  if (distance < 42) {
    if (angle < -24) return "3루수";
    if (angle < -8) return "유격수";
    if (angle < 10) return "2루수";
    if (angle < 26) return "1루수";
    return "1루 베이스 옆";
  }
  if (angle < -30) return "좌익 파울선";
  if (angle < -16) return "좌익수";
  if (angle < -7) return "좌중간";
  if (angle < 7) return "중견수";
  if (angle < 16) return "우중간";
  if (angle < 30) return "우익수";
  return "우익 파울선";
}

function battedShape(result: ResultCode, speed: number, rng: Rng) {
  if (result === "HR") {
    return { distance: Math.round(112 + rng() * 28), ev: Math.round(158 + rng() * 16), la: Math.round(22 + rng() * 12) };
  }
  if (result === "3B") {
    return { distance: Math.round(98 + rng() * 18), ev: Math.round(148 + rng() * 14), la: Math.round(10 + rng() * 12) };
  }
  if (result === "2B") {
    return { distance: Math.round(82 + rng() * 28), ev: Math.round(142 + rng() * 16), la: Math.round(8 + rng() * 14) };
  }
  if (result === "1B") {
    const infield = speed >= 60 && rng() < (speed - 48) / 160;
    if (infield) return { distance: Math.round(16 + rng() * 24), ev: Math.round(112 + rng() * 28), la: Math.round(-8 + rng() * 14) };
    return { distance: Math.round(62 + rng() * 32), ev: Math.round(132 + rng() * 20), la: Math.round(4 + rng() * 16) };
  }
  if (result === "GO" || result === "E") {
    return { distance: Math.round(8 + rng() * 36), ev: Math.round(108 + rng() * 32), la: Math.round(-18 + rng() * 20) };
  }
  if (result === "LO") {
    return { distance: Math.round(48 + rng() * 36), ev: Math.round(148 + rng() * 16), la: Math.round(6 + rng() * 12) };
  }
  return { distance: Math.round(72 + rng() * 38), ev: Math.round(128 + rng() * 22), la: Math.round(24 + rng() * 22) };
}

function ordinal(half: Half, inning: number) {
  return `${inning}회${half === "T" ? "초" : "말"}`;
}

function jong(name: string) {
  const last = name.charCodeAt(name.length - 1);
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return 21;
  return (last - 0xac00) % 28;
}

function wa(name: string) {
  return jong(name) === 0 ? "와" : "과";
}

function iga(name: string) {
  return jong(name) === 0 ? "가" : "이";
}

function eul(name: string) {
  return jong(name) === 0 ? "를" : "을";
}

function ro(name: string) {
  const code = jong(name);
  return code === 0 || code === 8 ? "로" : "으로";
}

let seq = 0;
function nid(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function simulateGame(
  away: Team,
  home: Team,
  options?: {
    seed?: number;
    awayStarterId?: string;
    homeStarterId?: string;
    ownerId?: string;
    id?: string;
    homeAdvantage?: boolean;
    regulationInnings?: 7 | 9;
    seriesId?: string;
    seriesGame?: number;
    seriesFormat?: import("@/lib/types").SeriesFormat;
    venue?: import("@/lib/types").VenueMode;
  },
): GameRecord {
  seq = 0;
  const seed = options?.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const rng = mulberry32(seed);
  const sim = new Sim(away, home, rng, options?.awayStarterId, options?.homeStarterId, {
    homeAdvantage: options?.homeAdvantage ?? true,
    regulationInnings: options?.regulationInnings ?? 9,
  });
  sim.run();
  return sim.finish(options?.id ?? `game-${seed}`, options?.ownerId ?? "local", seed, {
    homeAdvantage: options?.homeAdvantage ?? true,
    innings: options?.regulationInnings ?? 9,
    seriesId: options?.seriesId,
    seriesGame: options?.seriesGame,
    series: options?.seriesFormat,
    venue: options?.venue,
  });
}

class Sim {
  rng: Rng;
  teams: [Team, Team];
  score: [number, number] = [0, 0];
  hits: [number, number] = [0, 0];
  errors: [number, number] = [0, 0];
  lob: [number, number] = [0, 0];
  inning = 1;
  half: Half = "T";
  outs = 0;
  ghostOuts = 0;
  bases: (Runner | null)[] = [null, null, null];
  order: [string[], string[]] = [[], []];
  slotPos: [Record<string, Position>, Record<string, Position>] = [{}, {}];
  index: [number, number] = [0, 0];
  bench: [string[], string[]] = [[], []];
  batting: Record<string, BatLine> = {};
  batOrder: [string[], string[]] = [[], []];
  apps: App[] = [];
  current: [App | null, App | null] = [null, null];
  used = new Set<string>();
  pool: [Player[], Player[]] = [[], []];
  plays: PlateAppearance[] = [];
  lines: [number[], (number | null)[]] = [[], []];
  halfRuns = 0;
  walkOff = false;
  over = false;
  goAhead: GameRecord["decisions"]["decisive"] = null;
  goAheadPitcher: string | null = null;
  potentialWin: string | null = null;
  yearPair: [number | null, number | null];
  homeAdvantage: boolean;
  regulationInnings: number;

  constructor(
    away: Team,
    home: Team,
    rng: Rng,
    awayStarter?: string,
    homeStarter?: string,
    mode?: { homeAdvantage?: boolean; regulationInnings?: 7 | 9 },
  ) {
    this.rng = rng;
    this.teams = [away, home];
    this.yearPair = [away.year, home.year];
    this.homeAdvantage = mode?.homeAdvantage ?? true;
    this.regulationInnings = mode?.regulationInnings ?? 9;
    for (const side of [0, 1] as Side[]) {
      const team = this.teams[side];
      this.order[side] = team.lineup.map((slot) => slot.playerId);
      for (const slot of team.lineup) this.slotPos[side][slot.playerId] = slot.position;
      this.bench[side] = [...team.bench];
      const starterId =
        (side === 0 ? awayStarter : homeStarter) && team.rotation.includes(side === 0 ? awayStarter! : homeStarter!)
          ? side === 0
            ? awayStarter!
            : homeStarter!
          : team.rotation[0];
      const closerIds = new Set(team.closers ?? []);
      const others = [
        ...team.bullpen.filter((id) => !closerIds.has(id)),
        ...team.rotation.filter((id) => id !== starterId),
        ...(team.closers ?? []),
      ];
      this.pool[side] = others
        .map((id) => team.players.find((p) => p.id === id))
        .filter((p): p is Player => Boolean(p && p.kind === "P"));
      const starter = team.players.find((p) => p.id === starterId) ?? team.players.find((p) => p.kind === "P");
      if (!starter) throw new Error("선발 투수가 없습니다.");
      this.current[side] = this.openApp(starter, side, "SP", false);
      for (const id of this.order[side]) this.ensureBatter(side, id, this.order[side].indexOf(id));
    }
  }

  player(side: Side, id: string) {
    const found = this.teams[side].players.find((p) => p.id === id);
    if (!found) throw new Error("선수를 찾지 못했습니다.");
    return found;
  }

  ensureBatter(side: Side, id: string, order: number) {
    if (this.batting[id]) return this.batting[id]!;
    const player = this.player(side, id);
    const line: BatLine = {
      playerId: id,
      name: player.name,
      position: this.slotPos[side][id] ?? player.positions[0] ?? "DH",
      side,
      order,
      ab: 0,
      r: 0,
      h: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      so: 0,
      sb: 0,
      hbp: 0,
    };
    this.batting[id] = line;
    this.batOrder[side].push(id);
    return line;
  }

  isListedCloser(side: Side, playerId: string) {
    return (this.teams[side].closers ?? []).includes(playerId);
  }

  openApp(player: Player, side: Side, role: "SP" | "RP", emergency: boolean) {
    const p = pitcherOf(player);
    const ipg = p.ip / Math.max(p.g, 1);
    const listedCloser = this.isListedCloser(side, player.id);
    // Starters top out near a modern pitch count; aces still stretch but rarely cruise past 110–115.
    const limit =
      role === "SP"
        ? clamp(ipg * 14.5 + 14 + Math.max(0, p.swar) * 0.55, 78, 118)
        : listedCloser
          ? clamp(18 + ipg * 10 + Math.max(0, p.swar), 16, 36)
          : clamp(12 + ipg * 13 + Math.max(0, p.swar), 14, 58);
    const closer =
      role === "RP" &&
      (listedCloser ||
        (p.sv >= 8 && p.sv === Math.max(...this.pool[side].map((arm) => pitcherOf(arm).sv), p.sv) && !(this.teams[side].closers ?? []).length));
    const app: App = {
      playerId: player.id,
      name: player.name,
      side,
      role,
      limit,
      outs: 0,
      bf: 0,
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      so: 0,
      hr: 0,
      hbp: 0,
      pitches: 0,
      runsThisInning: 0,
      enteredInning: this.inning,
      enteredLead: this.leadFor(side),
      enteredRunners: this.bases.filter(Boolean).length,
      saveSit: false,
      isCloser: closer,
      outsWhenEntered: 0,
      removedWithLead: null,
      emergency,
    };
    app.saveSit = this.isSaveSituation(side);
    this.apps.push(app);
    this.used.add(player.id);
    this.pool[side] = this.pool[side].filter((arm) => arm.id !== player.id);
    return app;
  }

  leadFor(defense: Side) {
    const offense: Side = defense === 0 ? 1 : 0;
    return this.score[defense] - this.score[offense];
  }

  isSaveSituation(defense: Side) {
    const lead = this.leadFor(defense);
    if (lead <= 0) return false;
    const runners = this.bases.filter(Boolean).length;
    return lead <= runners + 2;
  }

  run() {
    const awayStarter = this.current[0]!;
    const homeStarter = this.current[1]!;
    const modeNote = [
      this.regulationInnings === 7 ? "7이닝제" : null,
      this.homeAdvantage ? "홈 어드밴티지" : "중립 구장",
    ]
      .filter(Boolean)
      .join(" · ");
    this.plays.push(this.banner(
      `${this.teams[0].name}${wa(this.teams[0].name)} ${this.teams[1].name}의 경기${modeNote ? ` (${modeNote})` : ""}. 원정 선발은 ${awayStarter.name}, 홈 선발은 ${homeStarter.name}.`,
    ));
    let inning = 1;
    while (!this.over && inning <= 24) {
      this.inning = inning;
      this.playHalf(0);
      if (this.over) break;
      if (inning >= this.regulationInnings && this.score[1] > this.score[0]) {
        this.lines[1].push(null);
        this.over = true;
        break;
      }
      this.playHalf(1);
      if (this.over) break;
      if (inning >= this.regulationInnings && this.score[0] !== this.score[1]) {
        this.over = true;
        break;
      }
      inning += 1;
    }
  }

  playHalf(offense: Side) {
    const defense: Side = offense === 0 ? 1 : 0;
    this.half = offense === 0 ? "T" : "B";
    this.outs = 0;
    this.ghostOuts = 0;
    this.bases = [null, null, null];
    this.halfRuns = 0;
    const app = this.current[defense];
    if (app) app.runsThisInning = 0;
    if (this.inning >= 13) this.placeGhost(offense, defense);
    this.maybeHook(defense, true);
    let guard = 0;
    while (this.outs < 3 && !this.over && guard < 20) {
      guard += 1;
      this.maybeHook(defense, false);
      this.maybePinch(offense);
      this.plateAppearance(offense, defense);
    }
    let left = 0;
    for (const runner of this.bases) if (runner) left += 1;
    this.lob[offense] += left;
    if (this.half === "T") this.lines[0].push(this.halfRuns);
    else this.lines[1].push(this.over && this.walkOff ? this.halfRuns : this.halfRuns);
  }

  placeGhost(offense: Side, defense: Side) {
    const idx = (this.index[offense] + 8) % 9;
    const id = this.order[offense][idx]!;
    const player = this.player(offense, id);
    const app = this.current[defense]!;
    this.bases[1] = {
      id,
      name: player.name,
      speed: batterOf(player).speed,
      pitcherId: app.playerId,
      earned: true,
    };
    this.plays.push(this.banner(`${ordinal(this.half, this.inning)}, ${player.name}${iga(player.name)} 2루 주자로 나간다.`));
  }

  maybePinch(offense: Side) {
    if (this.inning < 8) return;
    const margin = this.score[offense] - this.score[offense === 0 ? 1 : 0];
    if (margin > -1 || margin < -3) return;
    if (this.index[offense] < 6) return;
    const id = this.order[offense][this.index[offense]]!;
    const current = this.player(offense, id);
    const benchId = [...this.bench[offense]].sort((a, b) => batterOf(this.player(offense, b)).ops - batterOf(this.player(offense, a)).ops)[0];
    if (!benchId) return;
    const next = this.player(offense, benchId);
    if (batterOf(next).ops < batterOf(current).ops + 0.08) return;
    this.bench[offense] = this.bench[offense].filter((pid) => pid !== benchId);
    this.order[offense][this.index[offense]] = benchId;
    this.slotPos[offense][benchId] = this.slotPos[offense][id] ?? "DH";
    this.ensureBatter(offense, benchId, this.index[offense]);
    const line = this.batting[benchId]!;
    line.position = `대타-${this.slotPos[offense][benchId]}`;
    this.plays.push(this.banner(`${current.name} 대신 대타 ${next.name}.`));
  }

  maybeHook(defense: Side, inningStart: boolean) {
    const app = this.current[defense];
    if (!app) return;
    if (!this.shouldHook(app, defense, inningStart)) return;
    const next = this.pickReliever(defense);
    if (!next) return;
    app.removedWithLead = this.leadFor(defense) > 0;
    const player = this.player(defense, next.id);
    const emergency = this.pool[defense].every((arm) => arm.id !== next.id) && this.used.has(next.id);
    const fresh = this.openApp(player, defense, "RP", emergency || this.used.has(player.id));
    // openApp already removed them if they were in the pool. If emergency reuse, used was already true.
    if (!this.apps.includes(fresh)) this.apps.push(fresh);
    this.current[defense] = fresh;
    const lead = this.leadFor(defense);
    const why =
      lead > 0 && this.inning >= 8
        ? "리드를 지키러"
        : lead < 0
          ? "추격을 막으러"
          : "이닝을 넘기려";
    this.plays.push(this.banner(`투수 교체. ${app.name}${eul(app.name)} 내리고 ${player.name}${iga(player.name)} ${why} 마운드에 오른다.`));
  }

  hasLateArms(defense: Side) {
    return this.pool[defense].some((arm) => !this.used.has(arm.id));
  }

  shouldHook(app: App, defense: Side, inningStart: boolean) {
    if (app.emergency && app.bf < 1) return false;
    const lead = this.leadFor(defense);
    const cruising = app.er <= 2 && app.runsThisInning === 0;
    const lateArms = this.hasLateArms(defense);
    if (app.role === "SP") {
      // Never create a one-out bullpen cameo by yanking mid-inning after the 7th
      // unless the inning is already on fire or the starter is far past his limit.
      if (!inningStart && this.inning >= 7) {
        if (app.runsThisInning >= 2) return true;
        if (app.pitches >= app.limit + 12) return true;
        return false;
      }

      if (app.pitches >= app.limit) return true;
      if (this.inning >= 5 && app.runsThisInning >= 3) return true;
      if (this.inning >= 6 && app.runsThisInning >= 2 && app.pitches >= 70) return true;
      if (this.inning >= 7 && !cruising && app.pitches >= app.limit - 22) return true;

      // 9th: decide before the inning starts. Prefer a full closer inning or a clean CG.
      if (inningStart && this.inning >= this.regulationInnings && lateArms) {
        if (lead <= 0) {
          if (app.pitches >= 100 || app.er >= 4) return true;
          return false;
        }
        // Through 8 and still fresh enough — usually finish; sometimes ask for a save.
        if (app.outs >= 24 && cruising && app.pitches <= 105) {
          if (lead <= 3 && app.pitches >= 92 && this.rng() < 0.28) return true;
          return false;
        }
        // Through 7: closer gets a real inning more often than a cameo after 8.
        if (app.outs >= 21 && app.outs < 24) {
          if (lead <= 3) return true;
          if (app.pitches >= 95) return true;
          return this.rng() < 0.4;
        }
        if (app.pitches >= 100 || !cruising) return true;
        return lead <= 3 ? this.rng() < 0.7 : this.rng() < 0.45;
      }

      // Eighth: get a fresh arm when the starter is spent, or set up a clean 9th save.
      if (inningStart && this.inning >= Math.max(8, this.regulationInnings - 1) && lateArms) {
        if (app.pitches >= 100) return true;
        if (lead > 0 && !cruising && app.pitches >= 80) return true;
        if (lead > 0 && lead <= 3 && app.outs >= 21 && app.pitches >= 88 && this.rng() < 0.6) return true;
        if (lead >= 4 && app.pitches >= 92 && this.rng() < 0.5) return true;
      }

      if (inningStart && this.inning >= 7 && lateArms) {
        if (app.pitches >= 105) return true;
        if (!cruising && app.pitches >= 88) return true;
        if (lead >= 5 && app.pitches >= 95 && this.rng() < 0.45) return true;
      }

      return false;
    }
    const saveSit = app.isCloser && lead > 0 && lead <= 3 && this.inning >= this.regulationInnings;
    if (saveSit && app.runsThisInning === 0 && app.pitches < Math.max(app.limit, 30)) return false;
    if (app.pitches >= app.limit) return true;
    if (app.runsThisInning >= 3) return true;
    if (app.runsThisInning >= 2 && app.pitches >= 10) return true;
    if (inningStart && app.pitches >= 12 && app.limit < 36 && !saveSit) return true;
    return false;
  }

  pickReliever(defense: Side): Player | null {
    const available = this.pool[defense].filter((arm) => !this.used.has(arm.id));
    const lead = this.leadFor(defense);
    const runners = this.bases.filter(Boolean).length;
    const saveSit =
      lead > 0 &&
      lead <= 3 &&
      (this.inning >= this.regulationInnings || (this.inning >= this.regulationInnings - 1 && runners > 0));
    const blowout = lead <= -4 || lead >= 5;
    const list = available.length ? available : this.emergencyArm(defense);
    if (!list.length) return null;
    const closerIds = new Set(this.teams[defense].closers ?? []);
    const scoreArm = (arm: Player) => {
      const p = pitcherOf(arm);
      const era = p.era || 4.5;
      const listed = closerIds.has(arm.id);
      // Keep dedicated closers for real save spots; do not burn them in the 6th.
      if (listed && saveSit && this.inning >= this.regulationInnings) return 5000 + p.sv * 5 - era;
      if (listed && !saveSit && this.inning < this.regulationInnings) return -4000 - era;
      if (listed && blowout) return -2000;
      if (saveSit && this.inning >= this.regulationInnings && (listed || p.sv >= 5)) return 1000 + p.sv * 5 - era;
      if (blowout) return -p.ip / Math.max(p.g, 1);
      if (lead > 0 && this.inning >= 7) return p.hld * 3 + p.sv - era;
      if (lead === 0 && this.inning >= 6) return p.swar * 4 - era + (p.hld > 0 ? 2 : 0);
      return p.swar * 2 - era * 0.4 + p.hld;
    };
    return [...list].sort((a, b) => scoreArm(b) - scoreArm(a))[0] ?? null;
  }

  emergencyArm(defense: Side) {
    const current = this.current[defense]?.playerId;
    return this.teams[defense].players.filter((p) => p.kind === "P" && p.id !== current);
  }

  plateAppearance(offense: Side, defense: Side) {
    const batterId = this.order[offense][this.index[offense]]!;
    const batter = this.player(offense, batterId);
    const batLine = this.ensureBatter(offense, batterId, this.index[offense]);
    const beforeOuts = this.outs;
    const stealNote = this.trySteal(offense, defense);
    if (this.outs >= 3) {
      if (stealNote) {
        this.plays.push({
          id: nid("pa"),
          inning: this.inning,
          half: this.half,
          outsBefore: beforeOuts,
          awayScore: this.score[0],
          homeScore: this.score[1],
          batterId,
          batterName: batter.name,
          pitcherId: this.current[defense]!.playerId,
          pitcherName: this.current[defense]!.name,
          result: "CS",
          resultLabel: "도루자",
          rbi: 0,
          pitches: [],
          text: stealNote,
          notes: [],
          awayAfter: this.score[0],
          homeAfter: this.score[1],
        });
      }
      return;
    }
    const pitcher = this.player(defense, this.current[defense]!.playerId);
    const app = this.current[defense]!;
    const rates = this.applyPitcherFatigue(
      this.applyHomeAdvantage(matchup(batterOf(batter), pitcherOf(pitcher), this.yearPair), offense),
      app,
    );
    let result = sampleResult(rates, this.rng);
    if ((result === "GO" || result === "FO" || result === "LO") && this.rng() < (result === "GO" ? 0.028 : 0.006)) {
      result = "E";
    }
    const pitches = this.buildPitches(batter, pitcher, result);
    app.bf += 1;
    app.pitches += pitches.length;
    const resolved = this.resolve(offense, defense, batter, batLine, result, pitches);
    const text = [stealNote, this.narrate(batter, pitcher, pitches, resolved.sentence)].filter(Boolean).join(" ");
    this.plays.push({
      id: nid("pa"),
      inning: this.inning,
      half: this.half,
      outsBefore: beforeOuts,
      awayScore: this.score[0],
      homeScore: this.score[1],
      batterId,
      batterName: batter.name,
      pitcherId: pitcher.id,
      pitcherName: pitcher.name,
      result,
      resultLabel: resolved.label,
      rbi: resolved.rbi,
      pitches,
      text,
      notes: [],
      awayAfter: this.score[0],
      homeAfter: this.score[1],
    });
    this.index[offense] = (this.index[offense] + 1) % 9;
    if (offense === 1 && this.inning >= this.regulationInnings && this.score[1] > this.score[0]) {
      this.walkOff = true;
      this.over = true;
    }
  }

  applyPitcherFatigue(rates: Rates, app: App): Rates {
    if (app.role !== "SP") return rates;
    const over = Math.max(0, app.pitches - 85);
    if (over <= 0 && app.outs < 18) return rates;
    const fatigue = clamp(over / 160 + Math.max(0, app.outs - 18) / 90, 0, 0.24);
    if (fatigue <= 0) return rates;
    let k = rates.k * (1 - fatigue * 0.55);
    let bb = rates.bb * (1 + fatigue * 0.35);
    let hbp = rates.hbp * (1 + fatigue * 0.2);
    let hr = rates.hr * (1 + fatigue * 0.45);
    let single = rates.single * (1 + fatigue * 0.4);
    let dbl = rates.double * (1 + fatigue * 0.35);
    let tpl = rates.triple * (1 + fatigue * 0.2);
    let go = rates.go;
    let fo = rates.fo;
    let lo = rates.lo;
    const sum = k + bb + hbp + hr + single + dbl + tpl + go + fo + lo;
    if (sum <= 0) return rates;
    const scale = 1 / sum;
    return {
      k: k * scale,
      bb: bb * scale,
      hbp: hbp * scale,
      hr: hr * scale,
      single: single * scale,
      double: dbl * scale,
      triple: tpl * scale,
      go: go * scale,
      fo: fo * scale,
      lo: lo * scale,
    };
  }

  applyHomeAdvantage(rates: Rates, offense: Side): Rates {
    if (!this.homeAdvantage) return rates;
    // Home batting (offense 1) gets a small bump; home pitching (offense 0) suppresses the visitor.
    const homeBatting = offense === 1;
    const hitMul = homeBatting ? 1.045 : 0.965;
    const kMul = homeBatting ? 0.96 : 1.04;
    const bbMul = homeBatting ? 1.03 : 0.97;
    let k = rates.k * kMul;
    let bb = rates.bb * bbMul;
    let hbp = rates.hbp;
    let hr = rates.hr * hitMul;
    let single = rates.single * hitMul;
    let dbl = rates.double * hitMul;
    let tpl = rates.triple * hitMul;
    let go = rates.go;
    let fo = rates.fo;
    let lo = rates.lo;
    const sum = k + bb + hbp + hr + single + dbl + tpl + go + fo + lo;
    if (sum <= 0) return rates;
    const scale = 1 / sum;
    return {
      k: k * scale,
      bb: bb * scale,
      hbp: hbp * scale,
      hr: hr * scale,
      single: single * scale,
      double: dbl * scale,
      triple: tpl * scale,
      go: go * scale,
      fo: fo * scale,
      lo: lo * scale,
    };
  }

  trySteal(offense: Side, defense: Side) {
    if (this.outs >= 2) return "";
    const first = this.bases[0];
    const second = this.bases[1];
    const third = this.bases[2];
    let runner: Runner | null = null;
    let target = 1;
    if (first && !second) {
      runner = first;
      target = 1;
    } else if (second && !third && second.speed >= 72 && this.rng() < 0.25) {
      runner = second;
      target = 2;
    }
    if (!runner) return "";
    const profile = batterProfile(batterOf(this.player(offense, runner.id)));
    const attempt = clamp(profile.sb / profile.pa * 2.1 + (runner.speed - 58) / 220, 0, 0.34);
    if (this.rng() > attempt) return "";
    const success = this.rng() < clamp(0.58 + runner.speed / 280 - (pitcherOf(this.player(defense, this.current[defense]!.playerId)).speed - 142) / 400, 0.35, 0.9);
    const baseName = target === 1 ? "2루" : "3루";
    if (success) {
      this.bases[target] = runner;
      this.bases[target - 1] = null;
      const line = this.batting[runner.id];
      if (line) line.sb += 1;
      return `${runner.name}${iga(runner.name)} 뛰었다. ${baseName} 도루.`;
    }
    this.bases[target - 1] = null;
    this.addOut();
    const line = this.batting[runner.id];
    if (line) {
      /* caught stealing is not stored separately in the box */
    }
    return `${runner.name}의 도루를 잡아내 ${baseName}에서 아웃.`;
  }

  buildPitches(batter: Player, pitcher: Player, result: ResultCode): PitchEvent[] {
    const rep = repertoire(pitcher);
    // Player speed is peak FB. Typical heaters sit a few km/h under that; max is rare.
    const maxFb = pitcherOf(pitcher).speed || 142;
    const pitches: PitchEvent[] = [];
    let balls = 0;
    let strikes = 0;
    const terminalKind: PitchCall =
      result === "K" ? (this.rng() < 0.58 ? "swinging_strike" : "called_strike") : result === "BB" ? "ball" : result === "HBP" ? "hbp" : "in_play";
    // Real ABs average ~3.8 pitches; long foul battles stay uncommon.
    const maxPitches = result === "K" || result === "BB" ? 9 : 8;
    for (let guard = 0; guard < maxPitches; guard++) {
      const inPlay = result !== "K" && result !== "BB" && result !== "HBP";
      const wantEnd =
        (result === "K" && strikes === 2) ||
        (result === "BB" && balls === 3) ||
        (result === "HBP" && (pitches.length >= 1 ? this.rng() < 0.65 : this.rng() < 0.4)) ||
        (inPlay && pitches.length >= 1 && this.rng() < 0.36 + pitches.length * 0.14) ||
        (inPlay && pitches.length >= 5 && this.rng() < 0.7) ||
        pitches.length + 1 >= maxPitches;
      let call: PitchCall;
      if (wantEnd) call = terminalKind;
      else if (strikes === 2 && balls < 3) call = this.rng() < 0.55 ? "foul" : "ball";
      else if (balls === 3 && strikes < 2) call = this.rng() < 0.32 ? "foul" : this.rng() < 0.72 ? "called_strike" : "swinging_strike";
      else {
        const roll = this.rng();
        if (roll < 0.36) call = "ball";
        else if (roll < 0.56) call = "called_strike";
        else if (roll < 0.72) call = "swinging_strike";
        else call = "foul";
        if (call === "ball" && balls >= 3) call = strikes < 2 ? (this.rng() < 0.55 ? "called_strike" : "swinging_strike") : "foul";
        if ((call === "called_strike" || call === "swinging_strike") && strikes >= 2) call = "foul";
      }
      const code = choosePitch(rep, balls, strikes, this.rng);
      const spot = locate(call, batter.bats, this.rng);
      if (call === "ball") balls += 1;
      else if (call === "called_strike" || call === "swinging_strike") strikes += 1;
      else if (call === "foul" && strikes < 2) strikes += 1;
      const typicalFb = maxFb - (2.4 + this.rng() * 3.6);
      let velo = typicalFb + (PITCH_OFF[code] ?? 0) + this.rng() * 2.2 - 0.8;
      if (code === "ff" && this.rng() < 0.14) velo = maxFb - this.rng() * 1.1;
      const pitch: PitchEvent = {
        id: nid("pit"),
        number: pitches.length + 1,
        code,
        typeLabel: PITCH_NAME[code] ?? code,
        velo: clamp(Math.round(velo), 98, maxFb),
        x: Math.round(spot.x * 100) / 100,
        y: Math.round(spot.y * 100) / 100,
        call,
        callLabel: CALL_LABEL[call],
        locationLabel: locationLabel(spot.x, spot.y, batter.bats),
        balls,
        strikes,
      };
      if (call === "in_play") {
        const shape = battedShape(result, batterOf(batter).speed, this.rng);
        const angle = Math.round(sprayAngle(batter.bats, result, this.rng));
        pitch.batted = {
          angle,
          distance: shape.distance,
          ev: shape.ev,
          la: shape.la,
          result,
          resultLabel: resultLabel(result),
          direction: directionOf(angle, shape.distance),
        };
      }
      pitches.push(pitch);
      if (call === "in_play" || call === "hbp" || (result === "K" && strikes >= 3) || (result === "BB" && balls >= 4)) break;
    }
    return pitches;
  }

  resolve(offense: Side, defense: Side, batter: Player, line: BatLine, result: ResultCode, pitches: PitchEvent[]) {
    const app = this.current[defense]!;
    const batted = pitches.find((pitch) => pitch.batted)?.batted;
    const speed = batterOf(batter).speed;
    let rbi = 0;
    let label = resultLabel(result);
    let sentence = "";
    const earnedRunner = this.ghostOuts < 3;
    const makeRunner = (): Runner => ({
      id: batter.id,
      name: batter.name,
      speed,
      pitcherId: app.playerId,
      earned: earnedRunner && result !== "E",
    });

    if (result === "K") {
      line.ab += 1;
      line.so += 1;
      app.so += 1;
      this.addOut();
      const last = pitches[pitches.length - 1];
      sentence = last?.call === "swinging_strike" ? "방망이가 돌았고, 삼진." : "방망이는 나오지 않았다. 루킹 삼진.";
    } else if (result === "BB") {
      line.bb += 1;
      app.bb += 1;
      rbi += this.walkLike(makeRunner());
      sentence = "볼넷. 걸어 나간다.";
    } else if (result === "HBP") {
      line.hbp += 1;
      app.hbp += 1;
      rbi += this.walkLike(makeRunner());
      sentence = "몸쪽 공이 몸을 스쳤다. 출루.";
    } else if (result === "HR") {
      line.ab += 1;
      line.h += 1;
      line.hr += 1;
      this.hits[offense] += 1;
      app.h += 1;
      app.hr += 1;
      const scored = [this.bases[2], this.bases[1], this.bases[0]].filter((r): r is Runner => Boolean(r));
      this.bases = [null, null, null];
      for (const runner of scored) rbi += this.scoreRunner(runner, true, offense, batter.name);
      rbi += this.scoreRunner(makeRunner(), true, offense, batter.name);
      line.rbi += rbi;
      sentence = `${batted?.direction ?? "담장"} 쪽으로 날아간 타구가 펜스를 넘겼다. ${scored.length + 1}점 홈런.`;
    } else if (result === "3B" || result === "2B" || result === "1B") {
      line.ab += 1;
      line.h += 1;
      this.hits[offense] += 1;
      app.h += 1;
      if (result === "3B") line.triples += 1;
      if (result === "2B") line.doubles += 1;
      rbi += this.advanceOnHit(result, makeRunner(), offense, batter.name);
      line.rbi += rbi;
      const word = result === "3B" ? "3루타" : result === "2B" ? "2루타" : batted && batted.distance < 45 ? "내야 안타" : "안타";
      label = word;
      sentence = `${batted?.direction ?? "외야"} 방향. ${word}${rbi ? `, ${rbi}타점` : ""}.`;
    } else if (result === "E") {
      line.ab += 1;
      this.errors[defense] += 1;
      this.addGhostOnly();
      const runner = makeRunner();
      runner.earned = false;
      rbi += this.advanceOnError(runner, offense, batter.name);
      sentence = `${batted?.direction ?? "내야"} 키를 맞고 빠졌다. 실책으로 살아 나간다.`;
    } else if (result === "GO") {
      const runnerSpeed = this.bases[0]?.speed ?? 99;
      const gidp =
        this.outs < 2 &&
        Boolean(this.bases[0]) &&
        (runnerSpeed < 62 || (speed < 78 && this.rng() < 0.34));
      if (gidp && this.bases[0] && this.outs < 2) {
        line.ab += 1;
        this.bases[0] = null;
        this.addOut();
        if (this.outs < 3) {
          this.addOut();
          if (this.bases[2] && this.outs < 3) {
            /* lead runner from third holds unless forced; first-and-third DP does not score automatically */
          }
          if (this.bases[1] && this.outs >= 3) {
            /* inning over */
          } else if (this.bases[1] && this.outs < 3) {
            this.bases[2] = this.bases[1];
            this.bases[1] = null;
          }
        }
        sentence = "땅볼은 병살로 이어졌다.";
        label = "병살타";
      } else {
        line.ab += 1;
        const forced = this.forceGround(batter.name);
        line.rbi += forced;
        rbi += forced;
        this.addOut();
        sentence = forced
          ? `${batted?.direction ?? "내야"} 땅볼. 주자는 홈을 밟고 타자는 아웃. ${forced}타점.`
          : `${batted?.direction ?? "내야"} 땅볼. 아웃.`;
      }
    } else if (result === "FO" || result === "LO") {
      const deep = (batted?.distance ?? 0) >= 75 && result === "FO";
      const sac = deep && this.outs < 2 && this.bases[2];
      if (!sac) line.ab += 1;
      if (sac && this.bases[2]) {
        rbi += this.scoreRunner(this.bases[2]!, true, offense, batter.name);
        this.bases[2] = null;
        line.rbi += rbi;
        label = "희생플라이";
        sentence = `${batted?.direction ?? "외야"} 플라이. 3루 주자가 태그업해 홈을 밟았다. 희생플라이.`;
      } else if (result === "LO") {
        sentence = `${batted?.direction ?? "내야"} 직선타. 그대로 잡혔다.`;
      } else {
        sentence = `${batted?.direction ?? "외야"} 뜬공. 아웃.`;
      }
      this.addOut();
    }
    if (batted) {
      sentence += ` 타구 속도 ${batted.ev}km, 발사각 ${batted.la}도, 비거리 ${batted.distance}m.`;
    }
    return { rbi, label, sentence };
  }

  walkLike(runner: Runner) {
    let rbi = 0;
    if (this.bases[0] && this.bases[1] && this.bases[2]) {
      rbi += this.scoreRunner(this.bases[2]!, true, this.half === "T" ? 0 : 1, runner.name);
      this.bases[2] = this.bases[1];
      this.bases[1] = this.bases[0];
      this.bases[0] = runner;
    } else if (this.bases[0] && this.bases[1]) {
      this.bases[2] = this.bases[1];
      this.bases[1] = this.bases[0];
      this.bases[0] = runner;
    } else if (this.bases[0]) {
      this.bases[1] = this.bases[0];
      this.bases[0] = runner;
    } else {
      this.bases[0] = runner;
    }
    const line = this.batting[runner.id];
    if (line) line.rbi += rbi;
    return rbi;
  }

  advanceOnHit(result: ResultCode, batter: Runner, offense: Side, batterName: string) {
    let rbi = 0;
    const scoreFrom = (slot: number) => {
      const runner = this.bases[slot];
      if (!runner) return;
      rbi += this.scoreRunner(runner, true, offense, batterName);
      this.bases[slot] = null;
    };
    if (result === "3B") {
      scoreFrom(2);
      scoreFrom(1);
      scoreFrom(0);
      this.bases = [null, null, batter];
    } else if (result === "2B") {
      scoreFrom(2);
      scoreFrom(1);
      if (this.bases[0]) {
        if (this.bases[0].speed >= 58 || this.rng() < 0.72) scoreFrom(0);
        else {
          this.bases[2] = this.bases[0];
          this.bases[0] = null;
        }
      }
      this.bases[1] = batter;
      this.bases[0] = null;
    } else {
      if (this.bases[2]) scoreFrom(2);
      if (this.bases[1]) {
        if ((batter.speed >= 55 && this.rng() < 0.55) || this.rng() < 0.7) scoreFrom(1);
        else {
          this.bases[2] = this.bases[1];
          this.bases[1] = null;
        }
      }
      if (this.bases[0]) {
        const extra = this.bases[0].speed >= 70 && this.rng() < 0.45;
        this.bases[extra ? 2 : 1] = this.bases[0];
        this.bases[0] = null;
      }
      this.bases[0] = batter;
    }
    return rbi;
  }

  advanceOnError(batter: Runner, offense: Side, batterName: string) {
    const rbi = 0;
    if (this.bases[2] && this.rng() < 0.55) {
      this.scoreRunner(this.bases[2]!, false, offense, batterName);
      this.bases[2] = null;
    }
    if (this.bases[1]) {
      this.bases[2] = this.bases[1];
      this.bases[1] = null;
    }
    if (this.bases[0]) {
      this.bases[1] = this.bases[0];
      this.bases[0] = null;
    }
    this.bases[0] = batter;
    return rbi;
  }

  forceGround(batterName: string) {
    let rbi = 0;
    const offense: Side = this.half === "T" ? 0 : 1;
    if (this.bases[0]) {
      if (this.bases[1] && this.bases[2]) {
        rbi += this.scoreRunner(this.bases[2]!, true, offense, batterName);
        this.bases[2] = this.bases[1];
        this.bases[1] = this.bases[0];
        this.bases[0] = null;
      } else if (this.bases[1]) {
        this.bases[2] = this.bases[1];
        this.bases[1] = this.bases[0];
        this.bases[0] = null;
      } else {
        this.bases[1] = this.bases[0];
        this.bases[0] = null;
      }
    }
    return rbi;
  }

  scoreRunner(runner: Runner, rbi: boolean, offense: Side, batterName: string) {
    this.score[offense] += 1;
    this.halfRuns += 1;
    const line = this.batting[runner.id];
    if (line) line.r += 1;
    const charged =
      [...this.apps].reverse().find((item) => item.playerId === runner.pitcherId && item.side !== offense) ??
      this.current[offense === 0 ? 1 : 0]!;
    charged.r += 1;
    if (runner.earned) charged.er += 1;
    charged.runsThisInning += 1;
    const defense: Side = offense === 0 ? 1 : 0;
    const tookLead = this.score[offense] > this.score[defense] && this.score[offense] - 1 <= this.score[defense];
    if (tookLead) {
      this.goAhead = {
        batterName: batterName || runner.name,
        inning: this.inning,
        half: this.half,
        text: rbi ? `${batterName}의 타점` : `${runner.name} 홈인`,
        rbi,
      };
      this.goAheadPitcher = runner.pitcherId;
      this.potentialWin = this.current[offense]?.playerId ?? this.apps.filter((item) => item.side === offense).at(-1)?.playerId ?? null;
    }
    return rbi ? 1 : 0;
  }

  addOut() {
    this.outs += 1;
    this.ghostOuts += 1;
    const defense: Side = this.half === "T" ? 1 : 0;
    const app = this.current[defense];
    if (app) app.outs += 1;
  }

  addGhostOnly() {
    this.ghostOuts += 1;
  }

  narrate(batter: Player, pitcher: Player, pitches: PitchEvent[], sentence: string) {
    const bits = pitches.map((pitch) => {
      const ball = pitch.batted
        ? `${pitch.number}구 ${pitch.velo}km ${pitch.typeLabel}. ${pitch.batted.direction}${ro(pitch.batted.direction)} 맞았다.`
        : `${pitch.number}구 ${pitch.velo}km ${pitch.typeLabel}, ${pitch.callLabel}. ${pitch.locationLabel}.`;
      return ball;
    });
    return `${ordinal(this.half, this.inning)} ${this.outs}아웃. ${pitcher.name} 대 ${batter.name}. ${bits.join(" ")} ${sentence}`;
  }

  banner(text: string): PlateAppearance {
    return {
      id: nid("note"),
      inning: this.inning,
      half: this.half,
      outsBefore: this.outs,
      awayScore: this.score[0],
      homeScore: this.score[1],
      batterId: "",
      batterName: "",
      pitcherId: "",
      pitcherName: "",
      result: "NOTE",
      resultLabel: "기록",
      rbi: 0,
      pitches: [],
      text,
      notes: [],
      awayAfter: this.score[0],
      homeAfter: this.score[1],
    };
  }

  finish(id: string, ownerId: string, seed: number, mode?: GameModeInfo): GameRecord {
    const tied = this.score[0] === this.score[1];
    const winner: Side = this.score[0] > this.score[1] ? 0 : 1;
    const loserSide: Side = winner === 0 ? 1 : 0;
    let winId = tied ? null : this.potentialWin;
    const winApp = this.apps.find((app) => app.playerId === winId && app.side === winner);
    if (winApp && winApp.role === "SP" && winApp.outs < 15) {
      const later = this.apps.filter((app) => app.side === winner && app.role === "RP" && app.outs > 0);
      later.sort((a, b) => b.outs - a.outs);
      if (later[0]) winId = later[0].playerId;
    }
    if (!tied && !winId) winId = this.apps.filter((app) => app.side === winner).at(-1)?.playerId ?? null;
    const lossId = tied ? null : this.goAheadPitcher;
    const holds: string[] = [];
    let saveId: string | null = null;
    const finalPitcher = tied ? undefined : [...this.apps].reverse().find((app) => app.side === winner && app.outs > 0);
    if (finalPitcher && finalPitcher.playerId !== winId && finalPitcher.role === "RP") {
      const three = finalPitcher.outs >= 9;
      const kept = this.score[winner] > this.score[loserSide];
      if (kept && (finalPitcher.saveSit || three || (finalPitcher.enteredLead > 0 && finalPitcher.enteredLead <= 3))) {
        saveId = finalPitcher.playerId;
      }
    }
    for (const app of this.apps) {
      if (tied) break;
      if (app.side !== winner || app.role !== "RP") continue;
      if (app.playerId === winId || app.playerId === saveId) continue;
      if (!app.saveSit || app.outs < 1) continue;
      if (app.removedWithLead) holds.push(app.playerId);
    }
    const nameOf = (pid: string | null, side?: Side) => {
      if (!pid) return null;
      for (const s of [0, 1] as Side[]) {
        if (side != null && s !== side) continue;
        const player = this.teams[s].players.find((p) => p.id === pid);
        if (player) return { playerId: pid, name: player.name, teamName: this.teams[s].name };
      }
      return null;
    };
    const batting = {
      away: this.boxBatters(0),
      home: this.boxBatters(1),
    };
    const pitching = {
      away: this.boxPitchers(0, winId, lossId, saveId, holds),
      home: this.boxPitchers(1, winId, lossId, saveId, holds),
    };
    const win = nameOf(winId, winner);
    const loss = nameOf(lossId, loserSide);
    const save = nameOf(saveId, winner);
    const holdPlayers = holds.map((pid) => nameOf(pid, winner)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const cgOuts = this.regulationInnings * 3;
    const cgApp = this.apps.find(
      (app) => app.role === "SP" && app.outs >= cgOuts && this.score[app.side] >= this.score[app.side === 0 ? 1 : 0],
    );
    const completeGame = cgApp
      ? { name: cgApp.name, shutout: cgApp.r === 0 }
      : null;
    const awayR = this.score[0];
    const homeR = this.score[1];
    const decisive = this.score[0] === this.score[1] ? null : this.goAhead;
    const summary = this.summaryText(win, loss, save, holdPlayers, decisive, completeGame);
    const modeInfo: GameModeInfo = {
      homeAdvantage: mode?.homeAdvantage ?? this.homeAdvantage,
      innings: mode?.innings ?? (this.regulationInnings === 7 ? 7 : 9),
      series: mode?.series,
      seriesId: mode?.seriesId,
      seriesGame: mode?.seriesGame,
      venue: mode?.venue,
    };
    return {
      id,
      createdAt: new Date().toISOString(),
      ownerId,
      seed,
      away: snap(this.teams[0]),
      home: snap(this.teams[1]),
      opening: this.plays[0]?.text ?? "",
      summary,
      plays: this.plays,
      linescore: {
        away: this.lines[0],
        home: this.lines[1],
        awayR,
        homeR,
        awayH: this.hits[0],
        homeH: this.hits[1],
        awayE: this.errors[0],
        homeE: this.errors[1],
        awayLob: this.lob[0],
        homeLob: this.lob[1],
      },
      batting,
      pitching,
      decisions: { win, loss, save, holds: holdPlayers, decisive },
      walkOff: this.walkOff,
      completeGame,
      mode: modeInfo,
    };
  }

  boxBatters(side: Side): BoxBatter[] {
    return this.batOrder[side].map((id) => {
      const line = this.batting[id]!;
      return {
        playerId: id,
        name: line.name,
        position: line.position,
        ab: line.ab,
        r: line.r,
        h: line.h,
        doubles: line.doubles,
        triples: line.triples,
        hr: line.hr,
        rbi: line.rbi,
        bb: line.bb,
        so: line.so,
        sb: line.sb,
        hbp: line.hbp,
      };
    });
  }

  boxPitchers(side: Side, winId: string | null, lossId: string | null, saveId: string | null, holds: string[]): BoxPitcher[] {
    return this.apps
      .filter((app) => app.side === side)
      .map((app) => {
        const tags = [
          app.playerId === winId ? "승" : "",
          app.playerId === lossId ? "패" : "",
          app.playerId === saveId ? "세" : "",
          holds.includes(app.playerId) ? "홀" : "",
        ].filter(Boolean);
        return {
          playerId: app.playerId,
          name: app.name,
          ip: fmtIp(app.outs),
          outs: app.outs,
          h: app.h,
          r: app.r,
          er: app.er,
          bb: app.bb,
          so: app.so,
          hr: app.hr,
          hbp: app.hbp,
          pitches: app.pitches,
          decision: tags.join("·"),
        };
      });
  }

  summaryText(
    win: { name: string } | null,
    loss: { name: string } | null,
    save: { name: string } | null,
    holds: { name: string }[],
    decisive: GameRecord["decisions"]["decisive"],
    cg: { name: string; shutout: boolean } | null,
  ) {
    const score = `${this.score[0]}-${this.score[1]}`;
    const bits = [`${this.teams[1].shortName} ${this.score[1]}, ${this.teams[0].shortName} ${this.score[0]}. 최종 ${score}.`];
    if (this.score[0] === this.score[1]) bits.push("무승부.");
    if (this.walkOff) bits.push("끝내기.");
    if (cg) bits.push(cg.shutout ? `${cg.name} 완봉.` : `${cg.name} 완투.`);
    if (win) bits.push(`승투 ${win.name}.`);
    if (loss) bits.push(`패투 ${loss.name}.`);
    if (save) bits.push(`세이브 ${save.name}.`);
    if (holds.length) bits.push(`홀드 ${holds.map((h) => h.name).join(", ")}.`);
    if (decisive?.rbi) bits.push(`결승타는 ${decisive.inning}회${decisive.half === "T" ? "초" : "말"} ${decisive.batterName}.`);
    else if (decisive) bits.push(`결승 득점은 ${decisive.inning}회${decisive.half === "T" ? "초" : "말"} ${decisive.batterName} 때.`);
    return bits.join(" ");
  }
}

function resultLabel(result: ResultCode) {
  const map: Record<ResultCode, string> = {
    K: "삼진",
    BB: "볼넷",
    HBP: "사구",
    "1B": "안타",
    "2B": "2루타",
    "3B": "3루타",
    HR: "홈런",
    GO: "땅볼",
    FO: "뜬공",
    LO: "직선타",
    E: "실책",
  };
  return map[result];
}

function snap(team: Team) {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    primary: team.primary,
    secondary: team.secondary,
  };
}
