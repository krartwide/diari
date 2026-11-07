"use client";

import { useEffect, useState } from "react";
import { TeamEditor } from "@/components/team-editor";
import { findLocalTeam } from "@/lib/browser-data";
import { useQueryParam } from "@/lib/query";
import type { Team } from "@/lib/types";

export default function EditTeamPage() {
  const id = useQueryParam("id");
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("팀 주소가 올바르지 않습니다.");
      setTeam(null);
      return;
    }
    let cancelled = false;
    setError("");
    findLocalTeam(id)
      .then((found) => {
        if (cancelled) return;
        if (!found) setError("팀을 찾지 못했습니다.");
        else setTeam(found);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error && !team) return <main className="px-4 py-8 text-sm">{error}</main>;
  if (!team) return <main className="px-4 py-8 text-sm text-muted-foreground">구단을 불러오는 중입니다.</main>;
  return (
    <main>
      <TeamEditor initial={team} admin />
    </main>
  );
}
