"use client";

import { idbGet, idbGetAll, idbPut } from "@/lib/browser-db";
import type { GameRecord, Team } from "@/lib/types";

export type SyncPayload = {
  version: 1;
  updatedAt: string;
  games: GameRecord[];
  teams: Team[];
  achievements: { key: string; earnedAt: string }[];
};

type Meta = { key: string; value: string };

const CODE_RE = /^diari_[a-z0-9]{24}$/;

function syncBase() {
  const configured = (process.env.NEXT_PUBLIC_SYNC_API ?? "").replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window === "undefined") return "";
  // Static GitHub Pages has no API — require NEXT_PUBLIC_SYNC_API.
  if (window.location.hostname.endsWith("github.io")) return "";
  return "";
}

function syncUrl(code: string) {
  const base = syncBase();
  if (base) return `${base}/api/sync?code=${encodeURIComponent(code)}`;
  return `/api/sync?code=${encodeURIComponent(code)}`;
}

export function isValidSyncCode(code: string) {
  return CODE_RE.test(code.trim());
}

function randomCode() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = "diari_";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function getSyncCode() {
  const row = await idbGet<Meta>("meta", "syncCode");
  if (row?.value && isValidSyncCode(row.value)) return row.value;
  const code = randomCode();
  await idbPut("meta", { key: "syncCode", value: code });
  return code;
}

export async function setSyncCode(code: string) {
  const trimmed = code.trim();
  if (!isValidSyncCode(trimmed)) throw new Error("저장 코드 형식이 올바르지 않습니다. diari_ 로 시작하는 코드여야 합니다.");
  await idbPut("meta", { key: "syncCode", value: trimmed });
  return trimmed;
}

export async function buildLocalPayload(): Promise<SyncPayload> {
  const games = await idbGetAll<GameRecord>("games");
  const teams = await idbGetAll<Team>("teams");
  const achievements = await idbGetAll<{ key: string; earnedAt: string }>("achievements");
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    games: games.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 120),
    teams: teams.slice(0, 80),
    achievements: achievements.slice(0, 40),
  };
}

async function applyPayload(payload: SyncPayload) {
  for (const game of payload.games ?? []) {
    if (game?.id) await idbPut("games", game);
  }
  for (const team of payload.teams ?? []) {
    if (team?.id && !team.canonical) await idbPut("teams", team);
  }
  for (const row of payload.achievements ?? []) {
    if (row?.key && row.earnedAt) await idbPut("achievements", row);
  }
}

function mergePayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const games = new Map<string, GameRecord>();
  for (const game of [...(remote.games ?? []), ...(local.games ?? [])]) {
    if (!game?.id) continue;
    const prev = games.get(game.id);
    if (!prev || game.createdAt >= prev.createdAt) games.set(game.id, game);
  }
  const teams = new Map<string, Team>();
  for (const team of [...(remote.teams ?? []), ...(local.teams ?? [])]) {
    if (!team?.id || team.canonical) continue;
    teams.set(team.id, team);
  }
  const achievements = new Map<string, { key: string; earnedAt: string }>();
  for (const row of [...(remote.achievements ?? []), ...(local.achievements ?? [])]) {
    if (!row?.key || !row.earnedAt) continue;
    const prev = achievements.get(row.key);
    if (!prev || row.earnedAt >= prev.earnedAt) achievements.set(row.key, row);
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    games: [...games.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 120),
    teams: [...teams.values()].slice(0, 80),
    achievements: [...achievements.values()].slice(0, 40),
  };
}

export async function syncNow(): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") return { ok: false, message: "브라우저에서만 동기화할 수 있습니다." };
  const code = await getSyncCode();
  const local = await buildLocalPayload();
  let remote: SyncPayload | null = null;
  try {
    const res = await fetch(syncUrl(code), {
      headers: { "x-diari-sync": code },
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) return { ok: false, message: "동기화 서버를 찾지 못했습니다." };
      return { ok: false, message: "동기화 서버에 연결하지 못했습니다." };
    }
    const data = (await res.json()) as { empty?: boolean; payload?: SyncPayload | null; error?: string };
    if (data.error) return { ok: false, message: data.error };
    remote = data.payload ?? null;
  } catch {
    return {
      ok: false,
      message:
        syncBase() || !window.location.hostname.endsWith("github.io")
          ? "동기화 서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."
          : "GitHub Pages에서는 동기화 서버 주소(NEXT_PUBLIC_SYNC_API)가 필요합니다.",
    };
  }

  const merged = remote ? mergePayloads(local, remote) : local;
  await applyPayload(merged);

  try {
    const put = await fetch(syncUrl(code), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-diari-sync": code,
      },
      body: JSON.stringify({ payload: merged }),
    });
    if (!put.ok) {
      const err = (await put.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, message: err?.error ?? "클라우드에 올리지 못했습니다." };
    }
  } catch {
    return { ok: false, message: "클라우드에 올리지 못했습니다." };
  }

  await idbPut("meta", { key: "lastSyncAt", value: new Date().toISOString() });
  return {
    ok: true,
    message: remote ? "다른 기기 기록과 합친 뒤 저장했습니다." : "이 브라우저 기록을 클라우드에 저장했습니다.",
  };
}

export async function lastSyncAt() {
  const row = await idbGet<Meta>("meta", "lastSyncAt");
  return row?.value ?? null;
}

/** Background sync used after games/teams change. Swallows errors. */
export async function syncQuietly() {
  try {
    await syncNow();
  } catch {
    // ignore
  }
}
