import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";

export const SOLO_EMAIL = "solo@local.diari";
export const SOLO_NAME = "다이아리";

let adoptPromise: Promise<void> | null = null;

/** Single local owner used when login is disabled. */
export async function ensureSoloUser() {
  const user = await prisma.user.upsert({
    where: { email: SOLO_EMAIL },
    create: {
      email: SOLO_EMAIL,
      name: SOLO_NAME,
      emailVerified: new Date(),
    },
    update: {
      name: SOLO_NAME,
    },
  });
  if (!adoptPromise) {
    adoptPromise = adoptLocalRecords(user.id).catch((error) => {
      console.error("[solo] failed to adopt local records", error);
      adoptPromise = null;
    });
  }
  await adoptPromise;
  return user;
}

/**
 * Reattach orphaned SQLite rows and import leftover user-store.json records
 * so solo mode can see everything saved on this machine. Never deletes games/teams.
 */
async function adoptLocalRecords(soloId: string) {
  const games = await prisma.storedGame.findMany({ where: { NOT: { ownerId: soloId } } });
  for (const row of games) {
    const payload = JSON.parse(row.payload) as { ownerId?: string };
    payload.ownerId = soloId;
    await prisma.storedGame.update({
      where: { id: row.id },
      data: { ownerId: soloId, payload: JSON.stringify(payload) },
    });
  }

  const teams = await prisma.storedTeam.findMany({ where: { NOT: { ownerId: soloId } } });
  for (const row of teams) {
    const payload = JSON.parse(row.payload) as { ownerId?: string | null };
    payload.ownerId = soloId;
    await prisma.storedTeam.update({
      where: { id: row.id },
      data: { ownerId: soloId, payload: JSON.stringify(payload) },
    });
  }

  const achievements = await prisma.achievement.findMany({ where: { NOT: { userId: soloId } } });
  for (const row of achievements) {
    const existing = await prisma.achievement.findUnique({
      where: { userId_key: { userId: soloId, key: row.key } },
    });
    if (existing) {
      await prisma.achievement.delete({ where: { id: row.id } });
      continue;
    }
    await prisma.achievement.update({
      where: { id: row.id },
      data: { userId: soloId },
    });
  }

  const legacyPath = resolve(process.cwd(), "data/user-store.json");
  if (!existsSync(legacyPath)) return;
  const legacy = JSON.parse(readFileSync(legacyPath, "utf8")) as {
    teams?: Array<Record<string, unknown> & { id: string; visibility?: string; createdAt?: string }>;
    games?: Array<Record<string, unknown> & { id: string; summary?: string; createdAt?: string }>;
  };

  for (const team of legacy.teams ?? []) {
    const existing = await prisma.storedTeam.findUnique({ where: { id: team.id } });
    if (existing) continue;
    await prisma.storedTeam.create({
      data: {
        id: team.id,
        ownerId: soloId,
        visibility: typeof team.visibility === "string" ? team.visibility : "private",
        payload: JSON.stringify({ ...team, ownerId: soloId }),
        createdAt: team.createdAt ? new Date(team.createdAt) : undefined,
      },
    });
  }

  for (const game of legacy.games ?? []) {
    const existing = await prisma.storedGame.findUnique({ where: { id: game.id } });
    if (existing) continue;
    await prisma.storedGame.create({
      data: {
        id: game.id,
        ownerId: soloId,
        summary: String(game.summary ?? "").slice(0, 240),
        payload: JSON.stringify({ ...game, ownerId: soloId }),
        createdAt: game.createdAt ? new Date(game.createdAt) : undefined,
      },
    });
  }
}
