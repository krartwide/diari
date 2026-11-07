"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GameView } from "@/components/game-view";
import { findLocalGame } from "@/lib/browser-data";
import type { GameRecord } from "@/lib/types";

function GameViewInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [game, setGame] = useState<GameRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("경기 주소가 올바르지 않습니다.");
      return;
    }
    findLocalGame(id)
      .then((found) => {
        if (!found) setError("이 브라우저에 해당 경기가 없습니다.");
        else setGame(found);
      })
      .catch((caught: Error) => setError(caught.message));
  }, [id]);

  if (error) return <main className="px-3 py-8 text-sm sm:px-4">{error}</main>;
  if (!game) return <main className="px-3 py-8 text-sm text-muted-foreground sm:px-4">경기 기록을 불러오는 중입니다.</main>;
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <GameView game={game} />
    </main>
  );
}

export default function GameViewPage() {
  return (
    <Suspense fallback={<main className="px-3 py-8 text-sm text-muted-foreground sm:px-4">경기 기록을 불러오는 중입니다.</main>}>
      <GameViewInner />
    </Suspense>
  );
}
