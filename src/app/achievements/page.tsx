"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Row = {
  key: string;
  title: string;
  description: string;
  earnedAt: string | null;
};

export default function AchievementsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ achievements: Row[] }>("/api/achievements")
      .then((data) => setRows(data.achievements))
      .catch((caught: Error) => setError(caught.message));
  }, []);

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-3xl gap-5 px-3 py-5 sm:gap-6 sm:px-4 sm:py-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">업적</p>
        <h1 className="font-heading text-3xl sm:text-4xl">내 업적</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">계정에만 쌓입니다. 다른 사람과 기록이 섞이지 않습니다.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows && !error && <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>}
      <ul className="grid gap-2">
        {rows?.map((row) => (
          <li
            key={row.key}
            className={`rounded-2xl border px-4 py-3 ${row.earnedAt ? "border-primary/40 bg-card" : "border-border/70 bg-muted/20 opacity-70"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{row.description}</p>
              </div>
              <p className="text-xs whitespace-nowrap text-muted-foreground">{row.earnedAt ? "달성" : "미달성"}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
