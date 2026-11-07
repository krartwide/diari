"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GameView, Linescore } from "@/components/game-view";
import { TeamMark } from "@/components/team-mark";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { listLocalTeams, playLocalSeries } from "@/lib/browser-data";
import { defaultVenue, INNING_OPTIONS, SERIES_OPTIONS, seriesMeta, VENUE_OPTIONS } from "@/lib/modes";
import { gamePath } from "@/lib/paths";
import { groupHalves, halfLabel } from "@/lib/present";
import { playerById } from "@/lib/stats";
import type { GameRecord, SeriesFormat, SeriesRecord, Team, VenueMode } from "@/lib/types";

export function PlayDesk({ awayId, homeId }: { awayId?: string; homeId?: string }) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState("");
  const [away, setAway] = useState(awayId ?? "");
  const [home, setHome] = useState(homeId ?? "");
  const [awayStarterPick, setAwayStarterPick] = useState("");
  const [homeStarterPick, setHomeStarterPick] = useState("");
  const [series, setSeries] = useState<SeriesFormat>("single");
  const [innings, setInnings] = useState<7 | 9>(9);
  const [homeAdvantage, setHomeAdvantage] = useState(true);
  const [venue, setVenue] = useState<VenueMode>("fixed");
  const [venueTouched, setVenueTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ series: SeriesRecord; gameIndex: number } | null>(null);

  useEffect(() => {
    listLocalTeams()
      .then((items) => {
        setTeams(items);
        setAway((current) => current || items[0]?.id || "");
        setHome((current) => current || items[1]?.id || items[0]?.id || "");
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);

  useEffect(() => {
    if (!venueTouched) setVenue(defaultVenue(series));
  }, [series, venueTouched]);

  const awayTeam = teams?.find((team) => team.id === away);
  const homeTeam = teams?.find((team) => team.id === home);
  const awayStarter = awayTeam?.rotation.includes(awayStarterPick) ? awayStarterPick : (awayTeam?.rotation[0] ?? "");
  const homeStarter = homeTeam?.rotation.includes(homeStarterPick) ? homeStarterPick : (homeTeam?.rotation[0] ?? "");
  const meta = seriesMeta(series);

  async function start() {
    if (!away || !home) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const record = await playLocalSeries({
        awayId: away,
        homeId: home,
        awayStarterId: awayStarter,
        homeStarterId: homeStarter,
        series,
        innings,
        homeAdvantage,
        venue,
      });
      setResult({ series: record, gameIndex: 0 });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "경기를 시작하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const activeGame = result?.series.games[result.gameIndex] ?? null;

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-5 px-3 py-5 sm:gap-6 sm:px-4 sm:py-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">경기</p>
        <h1 className="font-heading text-3xl sm:text-4xl">팀 맞대결</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          단판부터 한국시리즈형 다전제까지 고르고, 홈 어드밴티지·이닝·구장 배분을 맞춘 뒤 시작합니다.
        </p>
      </div>
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
      {!teams && !error && <p className="text-sm text-muted-foreground">구단 명단을 불러오는 중입니다.</p>}
      {teams && teams.length === 0 && <p className="text-sm">쓸 수 있는 팀이 없습니다.</p>}
      {teams && teams.length > 0 && !result && (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamPick label="원정" teams={teams} teamId={away} onTeam={setAway} starterId={awayStarter} onStarter={setAwayStarterPick} />
            <TeamPick label="홈" teams={teams} teamId={home} onTeam={setHome} starterId={homeStarter} onStarter={setHomeStarterPick} />
          </div>

          <section className="grid gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div>
              <h2 className="text-sm font-medium">시리즈 형식</h2>
              <p className="mt-1 text-xs text-muted-foreground">{meta.detail}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {SERIES_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSeries(option.id)}
                  className={`min-h-16 rounded-xl border px-3 py-3 text-left transition ${
                    series === option.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <span className="block text-sm font-medium leading-snug">{option.label}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground sm:text-xs">{option.detail}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 border-t border-border pt-4 sm:gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-xs text-muted-foreground">이닝</span>
                <select
                  className="field-select"
                  value={innings}
                  onChange={(event) => setInnings(Number(event.target.value) === 7 ? 7 : 9)}
                >
                  {INNING_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} · {option.detail}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs text-muted-foreground">구장 배분</span>
                <select
                  className="field-select"
                  value={venue}
                  onChange={(event) => {
                    setVenueTouched(true);
                    setVenue(event.target.value as VenueMode);
                  }}
                  disabled={series === "single"}
                >
                  {VENUE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} · {option.detail}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">홈 어드밴티지</p>
                  <p className="text-xs text-muted-foreground">후공 타격·투수 소폭 보정</p>
                </div>
                <Switch checked={homeAdvantage} onCheckedChange={setHomeAdvantage} />
              </div>
            </div>
          </section>

          <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 -mx-3 border-t border-border/70 bg-background/95 px-3 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <Button
              type="button"
              className="h-11 w-full px-5 sm:h-10 sm:w-auto"
              onClick={start}
              disabled={busy || !away || !home || away === home}
            >
              {busy ? "경기를 만드는 중" : series === "single" ? "경기 시작" : `${meta.label} 시작`}
            </Button>
            {away === home && <p className="mt-2 text-xs text-muted-foreground">같은 팀끼리는 맞붙일 수 없습니다.</p>}
          </div>
        </div>
      )}
      {result && activeGame && (
        <SeriesDesk
          record={result.series}
          gameIndex={result.gameIndex}
          onSelectGame={(index) => setResult({ series: result.series, gameIndex: index })}
          onAgain={() => setResult(null)}
        />
      )}
    </div>
  );
}

function TeamPick({
  label,
  teams,
  teamId,
  onTeam,
  starterId,
  onStarter,
}: {
  label: string;
  teams: Team[];
  teamId: string;
  onTeam: (id: string) => void;
  starterId: string;
  onStarter: (id: string) => void;
}) {
  const team = teams.find((item) => item.id === teamId);
  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <select className="field-select" value={teamId} onChange={(event) => onTeam(event.target.value)}>
        {teams.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {team && (
        <div className="flex min-w-0 items-center gap-3">
          <TeamMark shortName={team.shortName} primary={team.primary} secondary={team.secondary} logo={team.logo} size={44} />
          <label className="grid min-w-0 flex-1 gap-1 text-xs">
            <span className="text-muted-foreground">선발</span>
            <select className="field-select" value={starterId} onChange={(event) => onStarter(event.target.value)}>
              {team.rotation.map((id) => (
                <option key={id} value={id}>
                  {playerById(team, id)?.name ?? id}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </section>
  );
}

function SeriesDesk({
  record,
  gameIndex,
  onSelectGame,
  onAgain,
}: {
  record: SeriesRecord;
  gameIndex: number;
  onSelectGame: (index: number) => void;
  onAgain: () => void;
}) {
  const game = record.games[gameIndex]!;
  const multi = record.games.length > 1 || record.format !== "single";
  const formatLabel = seriesMeta(record.format).label;

  return (
    <div className="grid min-w-0 gap-4">
      {multi && (
        <section className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{formatLabel}</p>
              <h2 className="font-heading text-xl sm:text-2xl">
                {record.away.shortName} {record.awayWins}
                <span className="mx-2 text-muted-foreground">–</span>
                {record.homeWins} {record.home.shortName}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{record.summary}</p>
            </div>
            <Button type="button" variant="outline" className="min-h-10 w-full sm:w-auto" onClick={onAgain}>
              다시 맞붙이기
            </Button>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {record.games.map((item, index) => {
              const topWon = item.linescore.awayR > item.linescore.homeR;
              const bottomWon = item.linescore.homeR > item.linescore.awayR;
              const label = `${item.away.shortName} ${item.linescore.awayR}–${item.linescore.homeR} ${item.home.shortName}`;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectGame(index)}
                  className={`min-w-[8.5rem] shrink-0 rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                    index === gameIndex ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="block font-medium">{index + 1}차전</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {label}
                    {topWon || bottomWon ? "" : " · 무"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      <LiveGame
        game={game}
        onAgain={onAgain}
        againLabel={multi ? "다른 시리즈" : "다른 경기"}
        hideAgain={multi}
      />
    </div>
  );
}

function LiveGame({
  game,
  onAgain,
  againLabel = "다른 경기",
  hideAgain = false,
}: {
  game: GameRecord;
  onAgain: () => void;
  againLabel?: string;
  hideAgain?: boolean;
}) {
  const halves = useMemo(() => groupHalves(game.plays), [game]);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setStep(0);
    setDone(false);
  }, [game.id]);

  useEffect(() => {
    if (done) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current + 1 >= halves.length) {
          setDone(true);
          return halves.length;
        }
        return current + 1;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [done, halves.length, game.id]);

  if (done) {
    return (
      <div className="grid min-w-0 gap-4">
        {!hideAgain && (
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button type="button" variant="outline" className="min-h-10" onClick={onAgain}>
              {againLabel}
            </Button>
            <Button asChild variant="secondary" className="min-h-10">
              <Link href={gamePath(game.id)}>기록 페이지</Link>
            </Button>
          </div>
        )}
        {hideAgain && (
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button asChild variant="secondary" className="min-h-10">
              <Link href={gamePath(game.id)}>이 경기 기록 페이지</Link>
            </Button>
          </div>
        )}
        <GameView game={game} />
      </div>
    );
  }

  const shown = halves.slice(0, Math.max(step, 1));
  const away: number[] = [];
  const home: (number | null)[] = [];
  let awayRuns = 0;
  let homeRuns = 0;
  for (const group of shown) {
    const last = group.plays[group.plays.length - 1];
    if (!last) continue;
    if (group.half === "T") {
      away.push(last.awayAfter - awayRuns);
      awayRuns = last.awayAfter;
    } else {
      home.push(last.homeAfter - homeRuns);
      homeRuns = last.homeAfter;
    }
  }
  const current = shown[shown.length - 1];
  const latest = [...(current?.plays ?? [])].reverse().find((play) => play.result !== "NOTE") ?? current?.plays.at(-1);
  const progress = Math.round((Math.max(step, 1) / Math.max(halves.length, 1)) * 100);
  const seriesNote =
    game.mode?.series && game.mode.series !== "single" && game.mode.seriesGame != null
      ? `${game.mode.seriesGame}차전`
      : null;

  return (
    <section className="scorebook grid min-w-0 gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[#6d6254]">진행표{seriesNote ? ` · ${seriesNote}` : ""}</p>
          <h2 className="text-xl sm:text-2xl">
            {game.away.shortName} {awayRuns}
            <span className="mx-2 text-[#6d6254]">:</span>
            {game.home.shortName} {homeRuns}
          </h2>
          <p className="text-sm">{current ? halfLabel(current.inning, current.half) : "경기 시작"}</p>
        </div>
        <Button type="button" variant="outline" className="min-h-10 shrink-0" onClick={() => setDone(true)}>
          끝까지
        </Button>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-[#6d6254]">
        {progress}% · {Math.max(step, 1)} / {halves.length} 이닝 절반
        {game.mode ? ` · ${game.mode.innings}이닝 · ${game.mode.homeAdvantage ? "홈 어드" : "중립"}` : ""}
      </p>
      <Linescore
        awayName={game.away.shortName}
        homeName={game.home.shortName}
        away={away}
        home={home}
        awayR={awayRuns}
        homeR={homeRuns}
      />
      {latest && <p className="text-sm leading-7">{latest.text}</p>}
    </section>
  );
}
