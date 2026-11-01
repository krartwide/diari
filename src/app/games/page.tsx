"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { whenLabel } from "@/components/game-view";
import { api } from "@/lib/client";
import type { GameRecord } from "@/lib/types";

type GameCard = Omit<GameRecord, "plays"> & { playCount: number };

export default function GamesPage() {
  const [games, setGames] = useState<GameCard[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ games: GameCard[] }>("/api/games")
      .then((data) => setGames(data.games))
      .catch((caught: Error) => setError(caught.message));
  }, []);

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-3xl gap-4 px-4 py-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">기록</p>
        <h1 className="font-heading text-4xl">지난 경기</h1>
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
            <Link href={`/games/${game.id}`} className="block rounded-2xl border border-border bg-card px-4 py-3 hover:border-primary/50">
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
