"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

type Me = { id: string; name: string | null; email: string | null; image: string | null };

export function AuthMenu() {
  const [user, setUser] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) {
          setUser(null);
          return;
        }
        const data = (await response.json()) as { user: Me };
        setUser(data.user);
      })
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <span className="text-xs text-muted-foreground">계정</span>;
  }

  if (!user) {
    return (
      <Button asChild size="sm" variant="secondary" className="rounded-full">
        <Link href="/login">로그인</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/achievements" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">
        {user.name || user.email || "내 계정"}
      </Link>
      <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => signOut({ callbackUrl: "/" })}>
        나가기
      </Button>
    </div>
  );
}
