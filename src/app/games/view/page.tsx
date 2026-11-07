"use client";

import { useEffect, useState } from "react";
import { GameView } from "@/components/game-view";
import { findLocalGame } from "@/lib/browser-data";
import { useQueryParam } from "@/lib/query";
import type { GameRecord } from "@/lib/types";

export default function GameViewPage() {
  const id = useQueryParam("id");
  const [game, setGame] = useState<GameRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("경기 주소가 올바르지 않습니다.");
      setGame(null);
      return;
    }
    let cancelled = false;
    setError("");
    findLocalGame(id)
      .then((found) => {
        if (cancelled) return;
        if (!found) setError("이 브라우저에 해당 경기가 없습니다.");
        else setGame(found);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <main className="px-3 py-8 text-sm sm:px-4">{error}</main>;
  if (!game) return <main className="px-3 py-8 text-sm text-muted-foreground sm:px-4">경기 기록을 불러오는 중입니다.</main>;
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <GameView game={game} />
    </main>
  );
}
