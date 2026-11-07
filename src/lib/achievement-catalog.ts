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
