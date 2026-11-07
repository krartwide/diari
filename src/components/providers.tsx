"use client";

import { useEffect } from "react";
import { hydrateFromServerIfEmpty } from "@/lib/browser-data";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void hydrateFromServerIfEmpty();
  }, []);
  return <>{children}</>;
}
