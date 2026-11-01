"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GameView, Linescore } from "@/components/game-view";
import { TeamMark } from "@/components/team-mark";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/client";
import { groupHalves, halfLabel } from "@/lib/present";
import { playerById } from "@/lib/stats";
import type { GameRecord, Team } from "@/lib/types";

export function PlayDesk({ awayId, homeId }: { awayId?: string; homeId?: string }) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState("");
  const [away, setAway] = useState(awayId ?? "");
  const [home, setHome] = useState(homeId ?? "");
  const [awayStarterPick, setAwayStarterPick] = useState("");
  const [homeStarterPick, setHomeStarterPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<GameRecord | null>(null);

  useEffect(() => {
    api<{ teams: Team[] }>("/api/teams")
      .then((data) => {
        setTeams(data.teams);
        setAway((current) => current || data.teams[0]?.id || "");
        setHome((current) => current || data.teams[1]?.id || data.teams[0]?.id || "");
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);

  const awayTeam = teams?.find((team) => team.id === away);
  const homeTeam = teams?.find((team) => team.id === home);
  const awayStarter = awayTeam?.rotation.includes(awayStarterPick) ? awayStarterPick : (awayTeam?.rotation[0] ?? "");
  const homeStarter = homeTeam?.rotation.includes(homeStarterPick) ? homeStarterPick : (homeTeam?.rotation[0] ?? "");

  async function start() {
    if (!away || !home) return;
    setBusy(true);
    setError("");
    setGame(null);
    try {
      const result = await api<{ game: GameRecord }>("/api/games", {
        method: "POST",
        body: JSON.stringify({ awayId: away, homeId: home, awayStarterId: awayStarter, homeStarterId: homeStarter }),
      });
      setGame(result.game);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "경기를 시작하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 py-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">경기</p>
        <h1 className="font-heading text-4xl">팀 맞대결</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          선발을 고르고 시작하면 이닝이 진행표에 쌓입니다. 끝난 뒤에는 공 하나, 타구 하나까지 글로 남습니다.
        </p>
      </div>
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
      {!teams && !error && <p className="text-sm text-muted-foreground">구단 명단을 불러오는 중입니다.</p>}
      {teams && teams.length === 0 && <p className="text-sm">쓸 수 있는 팀이 없습니다.</p>}
      {teams && teams.length > 0 && !game && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamPick label="원정" teams={teams} teamId={away} onTeam={setAway} starterId={awayStarter} onStarter={setAwayStarterPick} />
          <TeamPick label="홈" teams={teams} teamId={home} onTeam={setHome} starterId={homeStarter} onStarter={setHomeStarterPick} />
          <div className="lg:col-span-2">
            <Button type="button" className="h-10 px-5" onClick={start} disabled={busy || !away || !home}>
              {busy ? "경기를 만드는 중" : "경기 시작"}
            </Button>
          </div>
        </div>
      )}
      {game && <LiveGame game={game} onAgain={() => setGame(null)} />}
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
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <select className="field-select" value={teamId} onChange={(event) => onTeam(event.target.value)}>
        {teams.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {team && (
        <div className="flex items-center gap-3">
          <TeamMark shortName={team.shortName} primary={team.primary} secondary={team.secondary} logo={team.logo} size={48} />
          <label className="grid flex-1 gap-1 text-xs">
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

function LiveGame({ game, onAgain }: { game: GameRecord; onAgain: () => void }) {
  const halves = useMemo(() => groupHalves(game.plays), [game]);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

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
  }, [done, halves.length]);

  if (done) {
    return (
      <div className="grid min-w-0 gap-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onAgain}>
            다른 경기
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/games/${game.id}`}>기록 페이지</Link>
          </Button>
        </div>
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

  return (
    <section className="scorebook grid min-w-0 gap-4 rounded-2xl p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#6d6254]">진행표</p>
          <h2 className="text-2xl">
            {game.away.shortName} {awayRuns}
            <span className="mx-2 text-[#6d6254]">:</span>
            {game.home.shortName} {homeRuns}
          </h2>
          <p className="text-sm">{current ? halfLabel(current.inning, current.half) : "경기 시작"}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setDone(true)}>
          끝까지
        </Button>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-[#6d6254]">{progress}% · {Math.max(step, 1)} / {halves.length} 이닝 절반</p>
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
