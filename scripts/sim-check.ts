import { readFileSync } from "node:fs";
import { simulateGame } from "../src/lib/sim/engine";
import type { Team } from "../src/lib/types";

const teams = JSON.parse(readFileSync("src/data/canonical-teams.json", "utf8")) as Team[];

function byId(id: string) {
  const team = teams.find((item) => item.id === id);
  if (!team) throw new Error(id);
  return team;
}

function report(label: string, away: Team, home: Team, n: number) {
  let runs = 0;
  let hr = 0;
  let k = 0;
  let innings = 0;
  let cg = 0;
  let shutouts = 0;
  let saves = 0;
  let pitches = 0;
  let mismatches = 0;
  for (let i = 0; i < n; i++) {
    const game = simulateGame(away, home, { seed: 4100 + i * 17 });
    runs += game.linescore.awayR + game.linescore.homeR;
    innings += game.linescore.away.length;
    hr += [...game.batting.away, ...game.batting.home].reduce((sum, row) => sum + row.hr, 0);
    k += [...game.pitching.away, ...game.pitching.home].reduce((sum, row) => sum + row.so, 0);
    pitches += game.plays.reduce((sum, play) => sum + play.pitches.length, 0);
    if (game.completeGame) cg += 1;
    if (game.completeGame?.shutout) shutouts += 1;
    else if (game.linescore.awayR === 0 || game.linescore.homeR === 0) shutouts += 1;
    if (game.decisions.save) saves += 1;
    const batH = [...game.batting.away, ...game.batting.home].reduce((sum, row) => sum + row.h, 0);
    if (batH !== game.linescore.awayH + game.linescore.homeH) mismatches += 1;
    const awayRuns = game.batting.away.reduce((sum, row) => sum + row.r, 0);
    const homeRuns = game.batting.home.reduce((sum, row) => sum + row.r, 0);
    if (awayRuns !== game.linescore.awayR || homeRuns !== game.linescore.homeR) mismatches += 1;
    if (!game.decisions.win || !game.decisions.loss) mismatches += 1;
    if (i === 0) {
      console.log("\n" + label);
      console.log(game.summary);
      console.log(
        "원정",
        game.linescore.away.join(" "),
        game.linescore.awayR,
        "| 홈",
        game.linescore.home.map((cell) => (cell == null ? "X" : cell)).join(" "),
        game.linescore.homeR,
      );
      const sample = game.plays.find((play) => play.pitches.some((pitch) => pitch.batted));
      console.log(sample?.text);
      console.log(
        "승",
        game.decisions.win?.name,
        "패",
        game.decisions.loss?.name,
        "세",
        game.decisions.save?.name ?? "-",
        "홀",
        game.decisions.holds.map((hold) => hold.name).join(",") || "-",
        "완투",
        game.completeGame?.name ?? "-",
      );
    }
  }
  console.log(
    label,
    `평균득점 ${(runs / n).toFixed(2)}`,
    `홈런 ${(hr / n).toFixed(2)}`,
    `삼진 ${(k / n).toFixed(1)}`,
    `이닝 ${(innings / n).toFixed(2)}`,
    `완투 ${cg}/${n}`,
    `영봉 ${shutouts}/${n}`,
    `세이브 ${saves}/${n}`,
    `투구 ${Math.round(pitches / n)}`,
    `불일치 ${mismatches}`,
  );
}

report("2021 KT vs 2014 삼성", byId("canon-2021-kt"), byId("canon-2014-ss"), 24);
report("1983 삼미 vs 1986 청보", byId("canon-1983-hd"), byId("canon-1986-hd"), 12);
report("1993 해태 vs 2008 대표", byId("canon-1993-ht"), byId("canon-2008-kor"), 8);
