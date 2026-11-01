export type Bats = "L" | "R" | "S";
export type Throws = "L" | "R";
export type Position =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH"
  | "P";
export type Visibility = "public" | "private";
export type Half = "T" | "B";

export type BatterLine = {
  g: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  r: number;
  sb: number;
  bb: number;
  so: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  wrcPlus: number;
  swar: number;
  speed: number;
  pa?: number;
  hbp?: number;
  sf?: number;
  sac?: number;
  cs?: number;
};

export type PitcherLine = {
  g: number;
  w: number;
  l: number;
  sv: number;
  hld: number;
  ip: number;
  era: number;
  h: number;
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  whip: number;
  swar: number;
  speed: number;
  er?: number;
  r?: number;
};

export type Player = {
  id: string;
  name: string;
  kind: "B" | "P";
  bats: Bats;
  throws: Throws;
  positions: Position[];
  batter?: BatterLine;
  pitcher?: PitcherLine;
  sourceId?: string;
};

export type LineupSlot = {
  playerId: string;
  position: Position;
};

export type Team = {
  id: string;
  name: string;
  shortName: string;
  year: number | null;
  primary: string;
  secondary: string;
  logo: string | null;
  visibility: Visibility;
  ownerId: string | null;
  canonical: boolean;
  blurb: string;
  lineup: LineupSlot[];
  rotation: string[];
  bullpen: string[];
  bench: string[];
  players: Player[];
  createdAt: string;
};

export type PitchCall =
  | "ball"
  | "called_strike"
  | "swinging_strike"
  | "foul"
  | "in_play"
  | "hbp";

export type BattedBall = {
  angle: number;
  distance: number;
  ev: number;
  la: number;
  result: string;
  resultLabel: string;
  direction: string;
};

export type PitchEvent = {
  id: string;
  number: number;
  code: string;
  typeLabel: string;
  velo: number;
  x: number;
  y: number;
  call: PitchCall;
  callLabel: string;
  locationLabel: string;
  balls: number;
  strikes: number;
  batted?: BattedBall;
};

export type PlateAppearance = {
  id: string;
  inning: number;
  half: Half;
  outsBefore: number;
  awayScore: number;
  homeScore: number;
  awayAfter: number;
  homeAfter: number;
  batterId: string;
  batterName: string;
  pitcherId: string;
  pitcherName: string;
  result: string;
  resultLabel: string;
  rbi: number;
  pitches: PitchEvent[];
  text: string;
  notes: string[];
};

export type BoxBatter = {
  playerId: string;
  name: string;
  position: string;
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

export type BoxPitcher = {
  playerId: string;
  name: string;
  ip: string;
  outs: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  hbp: number;
  pitches: number;
  decision: string;
};

export type DecisionPlayer = {
  playerId: string;
  name: string;
  teamName: string;
};

export type GameRecord = {
  id: string;
  createdAt: string;
  ownerId: string;
  seed: number;
  away: { id: string; name: string; shortName: string; primary: string; secondary: string };
  home: { id: string; name: string; shortName: string; primary: string; secondary: string };
  opening: string;
  summary: string;
  plays: PlateAppearance[];
  linescore: {
    away: number[];
    home: (number | null)[];
    awayR: number;
    homeR: number;
    awayH: number;
    homeH: number;
    awayE: number;
    homeE: number;
    awayLob: number;
    homeLob: number;
  };
  batting: { away: BoxBatter[]; home: BoxBatter[] };
  pitching: { away: BoxPitcher[]; home: BoxPitcher[] };
  decisions: {
    win: DecisionPlayer | null;
    loss: DecisionPlayer | null;
    save: DecisionPlayer | null;
    holds: DecisionPlayer[];
    decisive: {
      batterName: string;
      inning: number;
      half: Half;
      text: string;
      rbi: boolean;
    } | null;
  };
  walkOff: boolean;
  completeGame: { name: string; shutout: boolean } | null;
};
