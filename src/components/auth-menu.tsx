"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = {
  id: string;
  name: string | null;
  email: string | null;
  admin?: boolean;
};

export function AuthMenu() {
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

  return (
    <Link href="/achievements" className="text-xs text-muted-foreground hover:text-foreground">
      {user?.name || "다이아리"}
      {user?.admin ? " · 혼자 사용" : ""}
    </Link>
  );
}
