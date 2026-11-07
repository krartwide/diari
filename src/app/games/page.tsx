"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { whenLabel } from "@/components/game-view";
import { listLocalGames } from "@/lib/browser-data";
import { gamePath } from "@/lib/paths";
import type { GameRecord } from "@/lib/types";

export default function GamesPage() {
  const [games, setGames] = useState<GameRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listLocalGames()
      .then(setGames)
      .catch((caught: Error) => setError(caught.message));
  }, []);

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-3xl gap-4 px-3 py-5 sm:px-4 sm:py-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">기록</p>
        <h1 className="font-heading text-3xl sm:text-4xl">지난 경기</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">이 브라우저에 저장된 경기만 보입니다. 서버가 꺼져도 기록은 남습니다.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!games && !error && <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>}
      {games && games.length === 0 && (
        <p className="text-sm text-muted-foreground">
          아직 치른 경기가 없습니다. <Link href="/play" className="text-primary underline">경기 화면</Link>에서 시작할 수 있습니다.
        </p>
      )}
      <ul className="grid gap-2">
        {games?.map((game) => (
          <li key={game.id}>
            <Link href={gamePath(game.id)} className="block rounded-2xl border border-border bg-card px-4 py-3 hover:border-primary/50">
              <p className="font-medium">
                {game.away.shortName} {game.linescore.awayR} : {game.home.shortName} {game.linescore.homeR}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{game.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">{whenLabel(game.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
