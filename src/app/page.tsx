"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TeamMark } from "@/components/team-mark";
import { Button } from "@/components/ui/button";
import { api, getUserId } from "@/lib/client";
import type { Team } from "@/lib/types";

export default function HomePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getUserId();
    api<{ teams: Team[] }>("/api/teams")
      .then((data) => setTeams(data.teams.filter((team) => team.canonical)))
      .catch((caught: Error) => setError(caught.message));
  }, []);

  return (
    <main>
      <section className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 py-12 sm:py-16">
        <p className="text-xs tracking-[0.22em] text-primary">SCOREBOOK</p>
        <h1 className="max-w-3xl font-heading text-5xl leading-tight sm:text-6xl">
          공 하나까지
          <br />
          글로 남는 야구
        </h1>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          팀 색깔과 사진을 정하고 선수의 시즌 기록을 넣으면, 그 팀으로 경기를 치를 수 있습니다. 구종, 구속, 스트라이크 판정, 타구 방향과 비거리가 기록지에 남습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-10 px-4">
            <Link href="/teams/new">팀 만들기</Link>
          </Button>
          <Button asChild variant="secondary" className="h-10 px-4">
            <Link href="/play">경기하기</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 px-4">
            <Link href="/teams">공개 구단</Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto grid w-full min-w-0 max-w-6xl gap-4 px-4 pb-16">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">공개 역사 구단</h2>
          <p className="text-xs text-muted-foreground">같은 선수, 같은 타순, 같은 기록</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="rounded-2xl border border-border bg-card p-3 hover:border-primary/50">
              <div className="mb-3 h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${team.primary}, ${team.secondary})` }} />
              <div className="flex items-center gap-3">
                <TeamMark shortName={team.shortName} name={team.name} primary={team.primary} secondary={team.secondary} size={48} />
                <div>
                  <p className="text-sm font-medium">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.year}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
