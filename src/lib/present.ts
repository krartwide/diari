import type { Half, PlateAppearance } from "@/lib/types";

export type HalfGroup = {
  key: string;
  inning: number;
  half: Half;
  plays: PlateAppearance[];
};

export function groupHalves(plays: PlateAppearance[]) {
  const groups: HalfGroup[] = [];
  for (const play of plays) {
    const key = `${play.inning}${play.half}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.plays.push(play);
    else groups.push({ key, inning: play.inning, half: play.half, plays: [play] });
  }
  return groups;
}

export function halfLabel(inning: number, half: Half) {
  return `${inning}회${half === "T" ? "초" : "말"}`;
}
