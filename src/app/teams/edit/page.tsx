"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TeamEditor } from "@/components/team-editor";
import { findLocalTeam } from "@/lib/browser-data";
import type { Team } from "@/lib/types";

function EditTeamInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("팀 주소가 올바르지 않습니다.");
      return;
    }
    findLocalTeam(id)
      .then((found) => {
        if (!found) setError("팀을 찾지 못했습니다.");
        else setTeam(found);
      })
      .catch((caught: Error) => setError(caught.message));
  }, [id]);

  if (error && !team) return <main className="px-4 py-8 text-sm">{error}</main>;
  if (!team) return <main className="px-4 py-8 text-sm text-muted-foreground">구단을 불러오는 중입니다.</main>;
  return (
    <main>
      <TeamEditor initial={team} admin />
    </main>
  );
}

export default function EditTeamPage() {
  return (
    <Suspense fallback={<main className="px-4 py-8 text-sm text-muted-foreground">구단을 불러오는 중입니다.</main>}>
      <EditTeamInner />
    </Suspense>
  );
}
