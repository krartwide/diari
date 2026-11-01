"use client";

import { useEffect, useState } from "react";
import { TeamEditor } from "@/components/team-editor";
import { getUserId } from "@/lib/client";
import { emptyTeam } from "@/lib/stats";
import type { Team } from "@/lib/types";

export default function NewTeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  useEffect(() => {
    const id = getUserId();
    queueMicrotask(() => setTeam(emptyTeam(id)));
  }, []);
  if (!team) return <main className="px-4 py-8 text-sm text-muted-foreground">준비 중입니다.</main>;
  return (
    <main>
      <TeamEditor initial={team} />
    </main>
  );
}
