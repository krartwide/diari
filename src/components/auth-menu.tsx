"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = {
  id: string;
  name: string | null;
  email: string | null;
  admin?: boolean;
};

export function AuthMenu({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { user: Me };
        setUser(data.user);
      })
      .catch(() => undefined);
  }, []);

  const label = compact ? user?.name || "혼자 사용" : `${user?.name || "다이아리"}${user?.admin ? " · 혼자 사용" : ""}`;

  return (
    <Link
      href="/achievements"
      className="max-w-[9rem] truncate text-xs text-muted-foreground hover:text-foreground sm:max-w-none"
      title={user?.name || "다이아리"}
    >
      {label}
    </Link>
  );
}
