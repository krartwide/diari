"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TeamMark } from "@/components/team-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getUserId } from "@/lib/client";
import type { Team } from "@/lib/types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const id = getUserId();
    queueMicrotask(() => setUserId(id));
    api<{ teams: Team[] }>("/api/teams")
      .then((data) => setTeams(data.teams))
      .catch((caught: Error) => setError(caught.message));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    return (teams ?? []).filter((team) => !q || team.name.includes(q) || team.shortName.includes(q) || String(team.year ?? "").includes(q));
  }, [teams, query]);

  const mine = filtered.filter((team) => !team.canonical && team.ownerId === userId);
  const shared = filtered.filter((team) => !team.canonical && team.ownerId !== userId);
  const canon = filtered.filter((team) => team.canonical);

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary">구단</p>
          <h1 className="font-heading text-4xl">팀 목록</h1>
        </div>
        <Button asChild className="h-10 px-4">
          <Link href="/teams/new">새 팀</Link>
        </Button>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 연도로 찾기" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!teams && !error && <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>}
      <TeamSection title="내 팀" teams={mine} empty="아직 만든 팀이 없습니다." />
      {shared.length > 0 && <TeamSection title="다른 사람의 공개 팀" teams={shared} empty="" />}
      <TeamSection
        title="공개 역사 구단"
        note="그 시즌 가을야구에 올릴 수 있는 엔트리입니다. 능력치는 정규시즌 기록입니다."
        teams={canon}
        empty="조건에 맞는 구단이 없습니다."
      />
    </main>
  );
}

function TeamSection({ title, note, teams, empty }: { title: string; note?: string; teams: Team[]; empty: string }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>}
      </div>
      {teams.length === 0 && empty && <p className="text-sm text-muted-foreground">{empty}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`} className="flex gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/50">
            <TeamMark name={team.name} shortName={team.shortName} primary={team.primary} secondary={team.secondary} logo={team.logo} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{team.name}</p>
                <Badge variant="outline">{team.canonical ? "공개 기록" : team.visibility === "public" ? "공개" : "비공개"}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{team.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
