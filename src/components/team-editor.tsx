"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerDialog } from "@/components/player-dialog";
import { TeamMark } from "@/components/team-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/client";
import { blankBatter, blankPitcher, playerById, POSITION_LABEL, POSITIONS, rosterIssues } from "@/lib/stats";
import type { Player, Position, Team } from "@/lib/types";

async function resizeLogo(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("사진을 줄이지 못했습니다.");
    const scale = Math.max(256 / image.width, 256 / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (256 - w) / 2, (256 - h) / 2, w, h);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function TeamEditor({ initial }: { initial: Team }) {
  const router = useRouter();
  const [team, setTeam] = useState(initial);
  const [draft, setDraft] = useState<Player | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const creating = !initial.name;

  function nameOf(id: string) {
    return playerById(team, id)?.name ?? "이름 없음";
  }

  function savePlayer(player: Player) {
    setTeam((current) => {
      const exists = current.players.some((item) => item.id === player.id);
      const players = exists ? current.players.map((item) => (item.id === player.id ? player : item)) : [...current.players, player];
      if (exists) return { ...current, players };
      if (player.kind === "B") {
        const position = player.positions.find((pos) => pos !== "P") ?? "DH";
        if (current.lineup.length < 9) {
          return { ...current, players, lineup: [...current.lineup, { playerId: player.id, position }] };
        }
        return { ...current, players, bench: [...current.bench, player.id] };
      }
      if (current.rotation.length < 5) return { ...current, players, rotation: [...current.rotation, player.id] };
      return { ...current, players, bullpen: [...current.bullpen, player.id] };
    });
    setDraft(null);
  }

  function removePlayer(id: string) {
    setTeam((current) => ({
      ...current,
      players: current.players.filter((player) => player.id !== id),
      lineup: current.lineup.filter((slot) => slot.playerId !== id),
      bench: current.bench.filter((item) => item !== id),
      rotation: current.rotation.filter((item) => item !== id),
      bullpen: current.bullpen.filter((item) => item !== id),
      closers: (current.closers ?? []).filter((item) => item !== id),
    }));
  }

  function moveLineup(index: number, dir: -1 | 1) {
    setTeam((current) => {
      const lineup = [...current.lineup];
      const next = index + dir;
      if (next < 0 || next >= lineup.length) return current;
      const a = lineup[index];
      const b = lineup[next];
      if (!a || !b) return current;
      lineup[index] = b;
      lineup[next] = a;
      return { ...current, lineup };
    });
  }

  function moveList(key: "bench" | "rotation" | "bullpen" | "closers", index: number, dir: -1 | 1) {
    setTeam((current) => {
      const list = [...(current[key] ?? [])];
      const next = index + dir;
      if (next < 0 || next >= list.length) return current;
      const a = list[index];
      const b = list[next];
      if (!a || !b) return current;
      list[index] = b;
      list[next] = a;
      return { ...current, [key]: list };
    });
  }

  const lineupIds = new Set(team.lineup.map((slot) => slot.playerId));
  const spareBatters = team.players.filter((player) => player.kind === "B" && !lineupIds.has(player.id) && !team.bench.includes(player.id));

  async function save() {
    const issues = rosterIssues({ ...team, name: team.name.trim() });
    if (issues[0]) {
      setError(issues[0]);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const path = creating ? "/api/teams" : `/api/teams/${team.id}`;
      const method = creating ? "POST" : "PATCH";
      const result = await api<{ team: Team }>(path, { method, body: JSON.stringify({ ...team, name: team.name.trim() }) });
      router.push(`/teams/${result.team.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장하지 못했습니다.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary">구단</p>
          <h1 className="font-heading text-4xl">{creating ? "새 팀" : team.name || "팀 고치기"}</h1>
        </div>
        <Button type="button" onClick={save} disabled={saving} className="h-10 px-4">
          {saving ? "저장하는 중" : "팀 저장"}
        </Button>
      </div>
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <TeamMark name={team.name} shortName={team.shortName || "팀"} primary={team.primary} secondary={team.secondary} logo={team.logo} size={120} />
          <label className="text-xs text-muted-foreground">
            팀 사진
            <input
              className="mt-1 block w-full text-xs"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const logo = await resizeLogo(file);
                  setTeam((current) => ({ ...current, logo }));
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "사진을 넣지 못했습니다.");
                }
              }}
            />
          </label>
          {team.logo && (
            <Button type="button" variant="ghost" onClick={() => setTeam({ ...team, logo: null })}>
              사진 빼기
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">팀 이름</span>
            <Input value={team.name} onChange={(event) => setTeam({ ...team, name: event.target.value })} placeholder="서울 다이아몬드" />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">짧은 이름</span>
            <Input value={team.shortName} maxLength={8} onChange={(event) => setTeam({ ...team, shortName: event.target.value })} placeholder="서울" />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">연도</span>
            <Input
              inputMode="numeric"
              value={team.year ?? ""}
              onChange={(event) => setTeam({ ...team, year: event.target.value ? Number(event.target.value) : null })}
              placeholder="2026"
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">주 색</span>
            <span className="flex gap-2">
              <input type="color" value={team.primary} onChange={(event) => setTeam({ ...team, primary: event.target.value })} aria-label="주 색" />
              <Input value={team.primary} onChange={(event) => setTeam({ ...team, primary: event.target.value })} />
            </span>
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">보조 색</span>
            <span className="flex gap-2">
              <input type="color" value={team.secondary} onChange={(event) => setTeam({ ...team, secondary: event.target.value })} aria-label="보조 색" />
              <Input value={team.secondary} onChange={(event) => setTeam({ ...team, secondary: event.target.value })} />
            </span>
          </label>
          <label className="grid gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">소개</span>
            <Textarea value={team.blurb} onChange={(event) => setTeam({ ...team, blurb: event.target.value })} rows={3} />
          </label>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 sm:col-span-2">
            <div>
              <p className="text-sm">공개 팀</p>
              <p className="text-xs text-muted-foreground">끄면 이 브라우저에서만 보입니다. 켜면 이 서버를 쓰는 누구나 경기에 넣을 수 있습니다. 공개 역사 구단은 여기서 고치지 않습니다.</p>
            </div>
            <Switch checked={team.visibility === "public"} onCheckedChange={(checked) => setTeam({ ...team, visibility: checked ? "public" : "private" })} />
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">타순 {team.lineup.length}/9</h2>
          <Button type="button" variant="secondary" onClick={() => setDraft(blankBatter())}>
            타자 추가
          </Button>
        </div>
        <div className="grid gap-2">
          {team.lineup.map((slot, index) => (
            <div key={slot.playerId} className="grid grid-cols-[2rem_1fr_8rem_auto] items-center gap-2">
              <span className="text-center text-sm text-muted-foreground">{index + 1}</span>
              <button type="button" className="truncate text-left text-sm hover:text-primary" onClick={() => {
                const player = playerById(team, slot.playerId);
                if (player) setDraft(player);
              }}>
                {nameOf(slot.playerId)}
              </button>
              <select
                className="field-select"
                value={slot.position}
                onChange={(event) => {
                  const position = event.target.value as Position;
                  setTeam((current) => ({
                    ...current,
                    lineup: current.lineup.map((item) => (item.playerId === slot.playerId ? { ...item, position } : item)),
                  }));
                }}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {POSITION_LABEL[pos]}
                  </option>
                ))}
              </select>
              <span className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => moveLineup(index, -1)} aria-label="위로">
                  ↑
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => moveLineup(index, 1)} aria-label="아래로">
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setTeam((current) => ({
                      ...current,
                      lineup: current.lineup.filter((item) => item.playerId !== slot.playerId),
                      bench: current.bench.includes(slot.playerId) ? current.bench : [...current.bench, slot.playerId],
                    }))
                  }
                >
                  대기
                </Button>
              </span>
            </div>
          ))}
        </div>
        {spareBatters.length > 0 && team.lineup.length < 9 && (
          <div className="flex flex-wrap gap-2">
            {spareBatters.map((player) => (
              <Button
                key={player.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setTeam((current) => ({
                    ...current,
                    lineup: [...current.lineup, { playerId: player.id, position: player.positions.find((pos) => pos !== "P") ?? "DH" }],
                  }))
                }
              >
                {player.name} 타순에
              </Button>
            ))}
          </div>
        )}
      </section>

      <ListEditor
        title="대기 타자"
        ids={team.bench}
        nameOf={nameOf}
        onEdit={(id) => {
          const player = playerById(team, id);
          if (player) setDraft(player);
        }}
        onMove={(index, dir) => moveList("bench", index, dir)}
        action={
          team.lineup.length < 9
            ? (id) =>
                setTeam((current) => ({
                  ...current,
                  bench: current.bench.filter((item) => item !== id),
                  lineup: [
                    ...current.lineup,
                    { playerId: id, position: playerById(current, id)?.positions.find((pos) => pos !== "P") ?? "DH" },
                  ],
                }))
            : undefined
        }
        actionLabel="타순"
      />

      <section className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setDraft(blankPitcher())}>
          투수 추가
        </Button>
      </section>
      <ListEditor
        title="선발 로테이션"
        ids={team.rotation}
        nameOf={nameOf}
        onEdit={(id) => {
          const player = playerById(team, id);
          if (player) setDraft(player);
        }}
        onMove={(index, dir) => moveList("rotation", index, dir)}
        action={(id) =>
          setTeam((current) => ({
            ...current,
            rotation: current.rotation.filter((item) => item !== id),
            closers: (current.closers ?? []).filter((item) => item !== id),
            bullpen: current.bullpen.includes(id) ? current.bullpen : [...current.bullpen, id],
          }))
        }
        actionLabel="불펜"
      />
      <ListEditor
        title="불펜"
        ids={team.bullpen}
        nameOf={nameOf}
        onEdit={(id) => {
          const player = playerById(team, id);
          if (player) setDraft(player);
        }}
        onMove={(index, dir) => moveList("bullpen", index, dir)}
        action={(id) =>
          setTeam((current) => ({
            ...current,
            bullpen: current.bullpen.filter((item) => item !== id),
            rotation: current.rotation.filter((item) => item !== id),
            closers: (current.closers ?? []).includes(id) ? current.closers : [...(current.closers ?? []), id],
          }))
        }
        actionLabel="마무리"
      />
      <ListEditor
        title="마무리"
        ids={team.closers ?? []}
        nameOf={nameOf}
        onEdit={(id) => {
          const player = playerById(team, id);
          if (player) setDraft(player);
        }}
        onMove={(index, dir) => moveList("closers", index, dir)}
        action={(id) =>
          setTeam((current) => ({
            ...current,
            closers: (current.closers ?? []).filter((item) => item !== id),
            bullpen: current.bullpen.includes(id) ? current.bullpen : [...current.bullpen, id],
          }))
        }
        actionLabel="불펜"
      />

      <section>
        <h2 className="mb-2 text-lg font-semibold">전체 명단</h2>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {team.players.map((player) => (
            <li key={player.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <button type="button" className="flex-1 text-left hover:text-primary" onClick={() => setDraft(player)}>
                {player.name}
                <span className="ml-2 text-xs text-muted-foreground">{player.kind === "P" ? "투수" : POSITION_LABEL[player.positions[0] ?? "DH"]}</span>
              </button>
              <Button type="button" size="sm" variant="ghost" onClick={() => removePlayer(player.id)}>
                삭제
              </Button>
            </li>
          ))}
          {team.players.length === 0 && <li className="px-3 py-6 text-sm text-muted-foreground">아직 선수가 없습니다. 타자와 투수를 추가하세요.</li>}
        </ul>
      </section>

      {draft && <PlayerDialog player={draft} onClose={() => setDraft(null)} onSave={savePlayer} />}
    </div>
  );
}

function ListEditor({
  title,
  ids,
  nameOf,
  onEdit,
  onMove,
  action,
  actionLabel,
}: {
  title: string;
  ids: string[];
  nameOf: (id: string) => string;
  onEdit: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  action?: (id: string) => void;
  actionLabel: string;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {ids.length === 0 && <p className="text-sm text-muted-foreground">비어 있습니다.</p>}
      {ids.map((id, index) => (
        <div key={id} className="flex items-center gap-2 text-sm">
          <button type="button" className="flex-1 text-left hover:text-primary" onClick={() => onEdit(id)}>
            {index + 1}. {nameOf(id)}
          </button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onMove(index, -1)} aria-label="위로">
            ↑
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onMove(index, 1)} aria-label="아래로">
            ↓
          </Button>
          {action && (
            <Button type="button" size="sm" variant="outline" onClick={() => action(id)}>
              {actionLabel}
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}
