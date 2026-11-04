"use client";

import { useEffect, useState } from "react";
import { GameView } from "@/components/game-view";
import { api } from "@/lib/client";
import type { GameRecord } from "@/lib/types";
import { useParams } from "next/navigation";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const [game, setGame] = useState<GameRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ game: GameRecord }>(`/api/games/${params.id}`)
      .then((data) => setGame(data.game))
      .catch((caught: Error) => setError(caught.message));
  }, [params.id]);

  if (error) return <main className="px-3 py-8 text-sm sm:px-4">{error}</main>;
  if (!game) return <main className="px-3 py-8 text-sm text-muted-foreground sm:px-4">경기 기록을 불러오는 중입니다.</main>;
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <GameView game={game} />
    </main>
  );
}
