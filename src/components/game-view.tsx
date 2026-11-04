"use client";

import { useState } from "react";
import { SprayChart } from "@/components/spray-chart";
import { StrikeZone } from "@/components/strike-zone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupHalves, halfLabel } from "@/lib/present";
import { fmtIp } from "@/lib/stats";
import { seriesMeta } from "@/lib/modes";
import type { BoxBatter, BoxPitcher, GameRecord, PitchEvent, PlateAppearance } from "@/lib/types";

export function whenLabel(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function Linescore({
  awayName,
  homeName,
  away,
  home,
  awayR,
  homeR,
  awayH,
  homeH,
  awayE,
  homeE,
}: {
  awayName: string;
  homeName: string;
  away: number[];
  home: (number | null)[];
  awayR: number;
  homeR: number;
  awayH?: number;
  homeH?: number;
  awayE?: number;
  homeE?: number;
}) {
  const innings = Math.max(away.length, home.length, 7);
  const headers = Array.from({ length: innings }, (_, index) => index + 1);
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse text-center text-xs sm:text-sm">
        <thead>
          <tr className="text-[#6d6254]">
            <th className="px-1.5 py-1 text-left">팀</th>
            {headers.map((inning) => (
              <th key={inning} className="px-1.5 py-1 font-medium">
                {inning}
              </th>
            ))}
            <th className="px-1.5 py-1">R</th>
            {awayH != null && <th className="px-1.5 py-1">H</th>}
            {awayE != null && <th className="px-1.5 py-1">E</th>}
          </tr>
        </thead>
        <tbody>
          <ScoreRow name={awayName} cells={away} innings={innings} r={awayR} h={awayH} e={awayE} />
          <ScoreRow name={homeName} cells={home} innings={innings} r={homeR} h={homeH} e={homeE} />
        </tbody>
      </table>
    </div>
  );
}

function ScoreRow({
  name,
  cells,
  innings,
  r,
  h,
  e,
}: {
  name: string;
  cells: (number | null)[];
  innings: number;
  r: number;
  h?: number;
  e?: number;
}) {
  return (
    <tr className="border-t border-[#241c14]/10">
      <td className="px-1.5 py-1.5 text-left font-medium whitespace-nowrap">{name}</td>
      {Array.from({ length: innings }, (_, index) => (
        <td key={index} className="px-1.5 py-1.5 tabular-nums">
          {cells[index] == null ? "" : cells[index]}
        </td>
      ))}
      <td className="px-1.5 py-1.5 font-semibold tabular-nums">{r}</td>
      {h != null && <td className="px-1.5 py-1.5 tabular-nums">{h}</td>}
      {e != null && <td className="px-1.5 py-1.5 tabular-nums">{e}</td>}
    </tr>
  );
}

export function GameView({ game }: { game: GameRecord }) {
  const [active, setActive] = useState<PitchEvent | null>(null);
  const [pa, setPa] = useState<PlateAppearance | null>(null);
  const groups = groupHalves(game.plays);

  function choose(play: PlateAppearance, pitch: PitchEvent) {
    setPa(play);
    setActive(pitch);
  }

  return (
    <div className="grid min-w-0 gap-5">
      <header className="grid gap-2">
        <p className="text-xs text-muted-foreground">{whenLabel(game.createdAt)} · 서울</p>
        <h1 className="font-heading text-3xl sm:text-4xl">
          {game.away.shortName} {game.linescore.awayR}
          <span className="mx-2 text-muted-foreground">:</span>
          {game.home.shortName} {game.linescore.homeR}
        </h1>
        {game.mode && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{game.mode.innings}이닝</span>
            <span>{game.mode.homeAdvantage ? "홈 어드밴티지" : "중립 구장"}</span>
            {game.mode.series && game.mode.series !== "single" && (
              <span>
                {seriesMeta(game.mode.series).label}
                {game.mode.seriesGame != null ? ` · ${game.mode.seriesGame}차전` : ""}
              </span>
            )}
          </p>
        )}
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{game.summary}</p>
      </header>

      <section className="scorebook min-w-0 rounded-2xl p-4">
        <Linescore
          awayName={game.away.shortName}
          homeName={game.home.shortName}
          away={game.linescore.away}
          home={game.linescore.home}
          awayR={game.linescore.awayR}
          homeR={game.linescore.homeR}
          awayH={game.linescore.awayH}
          homeH={game.linescore.homeH}
          awayE={game.linescore.awayE}
          homeE={game.linescore.homeE}
        />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Decision label="승" name={game.decisions.win?.name} />
          <Decision label="패" name={game.decisions.loss?.name} />
          <Decision label="세이브" name={game.decisions.save?.name} />
          <Decision label="홀드" name={game.decisions.holds.map((hold) => hold.name).join(", ")} />
          {game.completeGame && (
            <span>
              {game.completeGame.shutout ? "완봉" : "완투"} {game.completeGame.name}
            </span>
          )}
          {game.walkOff && <span>끝내기</span>}
        </div>
        {game.decisions.decisive && (
          <p className="mt-2 text-sm">
            결승{game.decisions.decisive.rbi ? "타" : " 득점"} {game.decisions.decisive.inning}회
            {game.decisions.decisive.half === "T" ? "초" : "말"} {game.decisions.decisive.batterName}
          </p>
        )}
        <p className="mt-2 text-xs text-[#6d6254]">
          잔루 {game.away.shortName} {game.linescore.awayLob} · {game.home.shortName} {game.linescore.homeLob}
        </p>
      </section>

      <Tabs defaultValue="log" className="min-w-0">
        <TabsList>
          <TabsTrigger value="log">경기 글</TabsTrigger>
          <TabsTrigger value="bat">타자</TabsTrigger>
          <TabsTrigger value="pit">투수</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="scorebook grid min-w-0 gap-4 rounded-2xl p-4">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="mb-2 text-sm font-semibold">{halfLabel(group.inning, group.half)}</h2>
                <div className="grid gap-3">
                  {group.plays.map((play) => (
                    <article key={play.id} className="border-t border-[#241c14]/10 pt-2">
                      {play.result === "NOTE" ? (
                        <p className="text-sm leading-6">{play.text}</p>
                      ) : (
                        <>
                          <p className="text-sm leading-7 break-words">{play.text}</p>
                          {play.pitches.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {play.pitches.map((pitch) => (
                                <button
                                  key={pitch.id}
                                  type="button"
                                  onClick={() => choose(play, pitch)}
                                  className={`rounded-full border px-2 py-1 text-xs ${
                                    active?.id === pitch.id ? "border-[#c23b2e] bg-[#fff8ea]" : "border-[#241c14]/15 bg-white/50"
                                  }`}
                                >
                                  {pitch.number}구 {pitch.typeLabel} {pitch.velo}km {pitch.callLabel}
                                  {pitch.batted ? ` · ${pitch.batted.direction} ${pitch.batted.distance}m` : ""}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className="h-fit rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-20">
            {active && pa ? (
              <div className="grid gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {pa.pitcherName} → {pa.batterName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {active.number}구 {active.typeLabel} {active.velo}km · {active.callLabel} · {active.locationLabel}
                  </p>
                </div>
                <StrikeZone pitches={pa.pitches} activeId={active.id} onSelect={(pitch) => setActive(pitch)} />
                {active.batted ? (
                  <SprayChart ball={active.batted} />
                ) : (
                  <p className="text-xs text-muted-foreground">인플레이된 공을 누르면 타구 방향이 나옵니다.</p>
                )}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                공 하나를 누르면 스트라이크 존에 찍힙니다. 배트가 맞았으면 방향, 비거리, 타구 속도도 같이 보입니다.
              </p>
            )}
          </aside>
        </TabsContent>
        <TabsContent value="bat">
          <div className="grid gap-6">
            <BoxBat title={game.away.name} rows={game.batting.away} />
            <BoxBat title={game.home.name} rows={game.batting.home} />
          </div>
        </TabsContent>
        <TabsContent value="pit">
          <div className="grid gap-6">
            <BoxPit title={game.away.name} rows={game.pitching.away} />
            <BoxPit title={game.home.name} rows={game.pitching.home} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Decision({ label, name }: { label: string; name?: string | null }) {
  if (!name) return null;
  return (
    <span>
      {label} {name}
    </span>
  );
}

function BoxBat({ title, rows }: { title: string; rows: BoxBatter[] }) {
  return (
    <section className="min-w-0 overflow-x-auto">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            {["타자", "포지션", "타수", "득점", "안타", "2루타", "3루타", "홈런", "타점", "볼넷", "삼진", "도루", "타율"].map((head) => (
              <th key={head} className="px-2 py-1 font-medium">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.playerId} className="border-t border-border">
              <td className="px-2 py-1.5">{row.name}</td>
              <td className="px-2 py-1.5">{row.position}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.ab}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.r}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.h}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.doubles}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.triples}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.hr}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.rbi}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.bb}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.so}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.sb}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.ab ? (row.h / row.ab).toFixed(3) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function BoxPit({ title, rows }: { title: string; rows: BoxPitcher[] }) {
  return (
    <section className="min-w-0 overflow-x-auto">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            {["투수", "결과", "이닝", "안타", "실점", "자책", "볼넷", "삼진", "피홈런", "투구"].map((head) => (
              <th key={head} className="px-2 py-1 font-medium">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.playerId}-${row.ip}`} className="border-t border-border">
              <td className="px-2 py-1.5">{row.name}</td>
              <td className="px-2 py-1.5">{row.decision || "–"}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.ip || fmtIp(row.outs)}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.h}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.r}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.er}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.bb}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.so}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.hr}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.pitches}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
