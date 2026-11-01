import { prisma } from "@/lib/prisma";
import type { GameRecord } from "@/lib/types";

export const ACHIEVEMENT_CATALOG = [
  { key: "first_game", title: "첫 경기", description: "다이아리에서 경기를 한 번 치렀습니다." },
  { key: "first_win", title: "첫 승리", description: "원정 또는 홈에서 이긴 경기를 남겼습니다." },
  { key: "walkoff", title: "끝내기", description: "끝내기 승부가 나온 경기를 치렀습니다." },
  { key: "shutout", title: "완봉", description: "완봉승이 나온 경기를 치렀습니다." },
  { key: "complete_game", title: "완투", description: "완투가 나온 경기를 치렀습니다." },
  { key: "extras", title: "연장전", description: "10회 이상까지 간 경기를 치렀습니다." },
  { key: "save", title: "세이브", description: "세이브가 기록된 경기를 치렀습니다." },
  { key: "ten_games", title: "10경기", description: "계정으로 경기 10경기를 남겼습니다." },
  { key: "public_team", title: "공개 구단", description: "팀을 공개로 저장했습니다." },
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_CATALOG)[number]["key"];

export function achievementMeta(key: string) {
  return ACHIEVEMENT_CATALOG.find((item) => item.key === key) ?? null;
}

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
