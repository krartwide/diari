"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TeamEditor } from "@/components/team-editor";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import type { Team } from "@/lib/types";

export default function EditTeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [editable, setEditable] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ team: Team; editable: boolean; admin?: boolean }>(`/api/teams/${params.id}`)
      .then((data) => {
        setTeam(data.team);
        setEditable(data.editable);
        setAdmin(Boolean(data.admin));
      })
      .catch((caught: Error) => setError(caught.message));
  }, [params.id]);

  if (error && !team) return <main className="px-4 py-8 text-sm">{error}</main>;
  if (!team) return <main className="px-4 py-8 text-sm text-muted-foreground">구단을 불러오는 중입니다.</main>;
  if (!editable) {
    return (
      <main className="mx-auto grid max-w-xl gap-3 px-4 py-10">
        <h1 className="font-heading text-3xl">{team.name}</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {team.canonical
            ? "이 구단은 공개 기록입니다. 원본은 사이트 운영자만 고칠 수 있습니다. 복제하면 선수와 기록을 내 팀에서 바꿀 수 있습니다."
            : "이 구단은 고칠 수 없습니다. 복제하면 선수와 기록을 내 팀에서 바꿀 수 있습니다."}
        </p>
        <Button
          type="button"
          onClick={async () => {
            const result = await api<{ team: Team }>(`/api/teams/${team.id}/duplicate`, { method: "POST" });
            router.push(`/teams/${result.team.id}/edit`);
          }}
        >
          복제해서 고치기
        </Button>
      </main>
    );
  }
  return (
    <main>
      <TeamEditor initial={team} admin={admin} />
    </main>
  );
}
