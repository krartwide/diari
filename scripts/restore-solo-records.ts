/**
 * One-shot restore: attach orphaned SQLite games/teams and legacy user-store.json
 * records to the solo user. Never deletes game/team rows.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { ensureSoloUser, SOLO_EMAIL } from "../src/lib/solo";

const prisma = new PrismaClient();

type LegacyStore = {
  teams?: Array<Record<string, unknown> & { id: string; name?: string; ownerId?: string; createdAt?: string }>;
  games?: Array<
    Record<string, unknown> & {
      id: string;
      ownerId?: string;
      summary?: string;
      createdAt?: string;
    }
  >;
};

async function main() {
  const solo = await ensureSoloUser();
  console.log("solo", solo.id, solo.email);

  const gameRows = await prisma.storedGame.findMany();
  let reassignedGames = 0;
  for (const row of gameRows) {
    if (row.ownerId === solo.id) continue;
    const payload = JSON.parse(row.payload) as { ownerId?: string };
    payload.ownerId = solo.id;
    await prisma.storedGame.update({
      where: { id: row.id },
      data: { ownerId: solo.id, payload: JSON.stringify(payload) },
    });
    reassignedGames += 1;
    console.log("reassign game", row.id, "from", row.ownerId);
  }

  const teamRows = await prisma.storedTeam.findMany();
  let reassignedTeams = 0;
  for (const row of teamRows) {
    if (row.ownerId === solo.id) continue;
    const payload = JSON.parse(row.payload) as { ownerId?: string | null };
    payload.ownerId = solo.id;
    await prisma.storedTeam.update({
      where: { id: row.id },
      data: { ownerId: solo.id, payload: JSON.stringify(payload) },
    });
    reassignedTeams += 1;
    console.log("reassign team", row.id, "from", row.ownerId);
  }

  const achievements = await prisma.achievement.findMany({ where: { NOT: { userId: solo.id } } });
  let movedAchievements = 0;
  for (const row of achievements) {
    const existing = await prisma.achievement.findUnique({
      where: { userId_key: { userId: solo.id, key: row.key } },
    });
    if (existing) {
      await prisma.achievement.delete({ where: { id: row.id } });
      console.log("drop duplicate achievement", row.key, "from", row.userId);
      continue;
    }
    await prisma.achievement.update({
      where: { id: row.id },
      data: { userId: solo.id },
    });
    movedAchievements += 1;
    console.log("move achievement", row.key, "from", row.userId);
  }

  const legacyPath = resolve(process.cwd(), "data/user-store.json");
  let importedGames = 0;
  let importedTeams = 0;
  if (existsSync(legacyPath)) {
    const legacy = JSON.parse(readFileSync(legacyPath, "utf8")) as LegacyStore;
    for (const team of legacy.teams ?? []) {
      const existing = await prisma.storedTeam.findUnique({ where: { id: team.id } });
      if (existing) {
        console.log("skip existing team", team.id);
        continue;
      }
      const payload = { ...team, ownerId: solo.id };
      await prisma.storedTeam.create({
        data: {
          id: team.id,
          ownerId: solo.id,
          visibility: typeof team.visibility === "string" ? team.visibility : "private",
          payload: JSON.stringify(payload),
          createdAt: team.createdAt ? new Date(team.createdAt) : undefined,
        },
      });
      importedTeams += 1;
      console.log("import team", team.id, team.name);
    }
    for (const game of legacy.games ?? []) {
      const existing = await prisma.storedGame.findUnique({ where: { id: game.id } });
      if (existing) {
        console.log("skip existing game", game.id);
        continue;
      }
      const payload = { ...game, ownerId: solo.id };
      await prisma.storedGame.create({
        data: {
          id: game.id,
          ownerId: solo.id,
          summary: String(game.summary ?? "").slice(0, 240),
          payload: JSON.stringify(payload),
          createdAt: game.createdAt ? new Date(game.createdAt) : undefined,
        },
      });
      importedGames += 1;
      console.log("import game", game.id, String(game.summary ?? "").slice(0, 60));
    }
  } else {
    console.log("no legacy file at", legacyPath);
  }

  const finalGames = await prisma.storedGame.count({ where: { ownerId: solo.id } });
  const finalTeams = await prisma.storedTeam.count({ where: { ownerId: solo.id } });
  console.log(
    JSON.stringify(
      {
        soloEmail: SOLO_EMAIL,
        reassignedGames,
        reassignedTeams,
        movedAchievements,
        importedGames,
        importedTeams,
        finalGames,
        finalTeams,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
