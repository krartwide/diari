import { prisma } from "@/lib/prisma";

const CODE_RE = /^diari_[a-z0-9]{24}$/;

export type SyncPayload = {
  version: 1;
  updatedAt: string;
  games: unknown[];
  teams: unknown[];
  achievements: { key: string; earnedAt: string }[];
};

export function isValidSyncCode(code: string) {
  return CODE_RE.test(code);
}

export async function readSyncVault(code: string): Promise<SyncPayload | null> {
  if (!isValidSyncCode(code)) return null;
  const row = await prisma.syncVault.findUnique({ where: { code } });
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as SyncPayload;
  } catch {
    return null;
  }
}

export async function writeSyncVault(code: string, payload: SyncPayload) {
  if (!isValidSyncCode(code)) throw new Error("저장 코드 형식이 올바르지 않습니다.");
  const body: SyncPayload = {
    version: 1,
    updatedAt: payload.updatedAt || new Date().toISOString(),
    games: Array.isArray(payload.games) ? payload.games.slice(0, 120) : [],
    teams: Array.isArray(payload.teams) ? payload.teams.slice(0, 80) : [],
    achievements: Array.isArray(payload.achievements) ? payload.achievements.slice(0, 40) : [],
  };
  const raw = JSON.stringify(body);
  if (raw.length > 4_500_000) throw new Error("저장할 기록이 너무 큽니다.");
  await prisma.syncVault.upsert({
    where: { code },
    create: { code, payload: raw },
    update: { payload: raw },
  });
  return body;
}
