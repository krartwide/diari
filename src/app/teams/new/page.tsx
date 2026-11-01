"use client";

import { useEffect, useState } from "react";
import { TeamEditor } from "@/components/team-editor";
import { emptyTeam } from "@/lib/stats";
import type { Team } from "@/lib/types";

export default function NewTeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("로그인이 필요합니다.");
        const data = (await response.json()) as { user: { id: string } };
        queueMicrotask(() => setTeam(emptyTeam(data.user.id)));
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);

  if (error) return <main className="px-4 py-8 text-sm text-destructive">{error}</main>;
  if (!team) return <main className="px-4 py-8 text-sm text-muted-foreground">준비 중입니다.</main>;
  return (
    <main>
      <TeamEditor initial={team} />
    </main>
  );
}
