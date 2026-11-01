"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TeamMark } from "@/components/team-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import { displayInnings, fmtAvg, fmtRate, handLabel, playerById, POSITION_LABEL } from "@/lib/stats";
import type { Player, Team } from "@/lib/types";

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [editable, setEditable] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ team: Team; editable: boolean }>(`/api/teams/${params.id}`)
      .then((data) => {
        setTeam(data.team);
        setEditable(data.editable);
      })
      .catch((caught: Error) => setError(caught.message));
  }, [params.id]);

  async function duplicate() {
    if (!team) return;
    setBusy(true);
    try {
      const result = await api<{ team: Team }>(`/api/teams/${team.id}/duplicate`, { method: "POST" });
      router.push(`/teams/${result.team.id}/edit`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "복제하지 못했습니다.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!team || !editable) return;
    if (!window.confirm(`${team.name}을 지울까요?`)) return;
    setBusy(true);
    try {
      await api(`/api/teams/${team.id}`, { method: "DELETE" });
      router.push("/teams");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "지우지 못했습니다.");
      setBusy(false);
    }
  }

  if (error && !team) return <main className="px-4 py-8 text-sm">{error}</main>;
  if (!team) return <main className="px-4 py-8 text-sm text-muted-foreground">구단을 불러오는 중입니다.</main>;

  const lineup = team.lineup.map((slot, index) => ({ slot, index, player: playerById(team, slot.playerId) })).filter((row) => row.player);
  const bench = team.bench.map((id) => playerById(team, id)).filter((player): player is Player => Boolean(player));
  const rotation = team.rotation.map((id) => playerById(team, id)).filter((player): player is Player => Boolean(player));
  const bullpen = team.bullpen.map((id) => playerById(team, id)).filter((player): player is Player => Boolean(player));

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <TeamMark name={team.name} shortName={team.shortName} primary={team.primary} secondary={team.secondary} logo={team.logo} size={84} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-4xl">{team.name}</h1>
              <Badge variant="outline">{team.canonical ? "공개 기록" : team.visibility === "public" ? "공개" : "비공개"}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{team.blurb}</p>
            {team.canonical && (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
                이 구단의 엔트리는 그 시즌 리그(정규시즌) 기준이며, 가을야구 엔트리가 아닙니다. wRC+와 sWAR는 KBO 기록실의 카운팅 기록으로 추정한 값입니다. 타율·출루율·장타율·OPS·ERA·WHIP은 그 기록에서 계산했습니다.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-10 px-4">
            <Link href={`/play?away=${team.id}`}>이 팀으로 경기</Link>
          </Button>
          {editable ? (
            <Button asChild variant="secondary">
              <Link href={`/teams/${team.id}/edit`}>고치기</Link>
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={duplicate} disabled={busy}>
              내 팀으로 복제
            </Button>
          )}
          {editable && (
            <Button type="button" variant="ghost" onClick={remove} disabled={busy}>
              삭제
            </Button>
          )}
        </div>
      </header>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="min-w-0 overflow-x-auto">
        <h2 className="mb-2 text-lg font-semibold">타순</h2>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              {["#", "포지션", "이름", "타격", "경기", "타수", "안타", "2루타", "3루타", "홈런", "타점", "득점", "도루", "볼넷", "삼진", "타율", "출루", "장타", "OPS", "wRC+", "sWAR", "속도"].map((head) => (
                <th key={head} className="px-2 py-1 font-medium whitespace-nowrap">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineup.map(({ slot, index, player }) => {
              const b = player!.batter;
              if (!b) return null;
              return (
                <tr key={player!.id} className="border-t border-border">
                  <td className="px-2 py-1.5">{index + 1}</td>
                  <td className="px-2 py-1.5">{POSITION_LABEL[slot.position]}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{player!.name}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{handLabel(player!.bats, player!.throws)}</td>
                  {[b.g, b.ab, b.h, b.doubles, b.triples, b.hr, b.rbi, b.r, b.sb, b.bb, b.so].map((value, cell) => (
                    <td key={cell} className="px-2 py-1.5 tabular-nums">
                      {value}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 tabular-nums">{fmtAvg(b.avg)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmtAvg(b.obp)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmtAvg(b.slg)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmtAvg(b.ops)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{b.wrcPlus}</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmtRate(b.swar)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{b.speed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {bench.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">대기 타자</h2>
          <p className="text-sm text-muted-foreground">
            {bench.map((player) => `${player.name} ${player.batter ? fmtAvg(player.batter.avg) : ""}`).join(" · ")}
          </p>
        </section>
      )}

      <PitchTable title="선발" players={rotation} />
      <PitchTable title="불펜" players={bullpen} />
    </main>
  );
}

function PitchTable({ title, players }: { title: string; players: Player[] }) {
  return (
    <section className="min-w-0 overflow-x-auto">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            {["이름", "투구", "출장", "승", "패", "세", "홀", "이닝", "ERA", "피안타", "피홈런", "볼넷", "사구", "탈삼진", "WHIP", "sWAR", "구속"].map((head) => (
              <th key={head} className="px-2 py-1 font-medium whitespace-nowrap">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const p = player.pitcher;
            if (!p) return null;
            return (
              <tr key={player.id} className="border-t border-border">
                <td className="px-2 py-1.5 whitespace-nowrap">{player.name}</td>
                <td className="px-2 py-1.5">{handLabel(player.bats, player.throws)}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.g}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.w}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.l}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.sv}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.hld}</td>
                <td className="px-2 py-1.5 tabular-nums">{displayInnings(p.ip)}</td>
                <td className="px-2 py-1.5 tabular-nums">{fmtRate(p.era)}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.h}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.hr}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.bb}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.hbp}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.so}</td>
                <td className="px-2 py-1.5 tabular-nums">{fmtRate(p.whip)}</td>
                <td className="px-2 py-1.5 tabular-nums">{fmtRate(p.swar)}</td>
                <td className="px-2 py-1.5 tabular-nums">{p.speed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
