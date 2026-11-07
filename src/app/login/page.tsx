"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Login removed — solo / browser-local use only. */
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/play");
  }, [router]);
  return <main className="px-4 py-8 text-sm text-muted-foreground">경기 화면으로 이동하는 중입니다.</main>;
}
