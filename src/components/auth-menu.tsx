"use client";

import Link from "next/link";

export function AuthMenu({ compact = false }: { compact?: boolean }) {
  const label = compact ? "이 브라우저" : "이 브라우저에 저장";

  return (
    <Link
      href="/achievements"
      className="max-w-[11rem] truncate text-xs text-muted-foreground hover:text-foreground sm:max-w-none"
      title="경기·팀 기록은 이 브라우저(IndexedDB)에 남습니다"
    >
      {label}
    </Link>
  );
}
