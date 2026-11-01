"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PlayDesk } from "@/components/play-desk";

function Desk() {
  const params = useSearchParams();
  return <PlayDesk awayId={params.get("away") ?? undefined} homeId={params.get("home") ?? undefined} />;
}

export default function PlayPage() {
  return (
    <Suspense fallback={<main className="px-4 py-8 text-sm text-muted-foreground">경기 화면을 준비하는 중입니다.</main>}>
      <Desk />
    </Suspense>
  );
}
