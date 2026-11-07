import { ACHIEVEMENT_CATALOG, type AchievementKey, achievementMeta } from "@/lib/achievement-catalog";
import { prisma } from "@/lib/prisma";
import type { GameRecord } from "@/lib/types";

export { ACHIEVEMENT_CATALOG, achievementMeta, type AchievementKey };

async function grant(userId: string, key: AchievementKey) {
  await prisma.achievement.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key },
    update: {},
  });
}

export async function listAchievements(userId: string) {
  const earned = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "asc" },
  });
  const earnedMap = new Map(earned.map((row) => [row.key, row.earnedAt.toISOString()]));
  return ACHIEVEMENT_CATALOG.map((item) => ({
    ...item,
    earnedAt: earnedMap.get(item.key) ?? null,
  }));
}

export async function awardGameAchievements(userId: string, game: GameRecord) {
  const gameCount = await prisma.storedGame.count({ where: { ownerId: userId } });
  await grant(userId, "first_game");
  if (game.linescore.awayR !== game.linescore.homeR) await grant(userId, "first_win");
  if (game.walkOff) await grant(userId, "walkoff");
  if (game.completeGame?.shutout) await grant(userId, "shutout");
  if (game.completeGame) await grant(userId, "complete_game");
  if (Math.max(game.linescore.away.length, game.linescore.home.length) >= 10) await grant(userId, "extras");
  if (game.decisions.save) await grant(userId, "save");
  if (gameCount >= 10) await grant(userId, "ten_games");
}

export async function awardPublicTeam(userId: string) {
  await grant(userId, "public_team");
}
