"use client";

import { useEffect } from "react";
import { hydrateFromServerIfEmpty } from "@/lib/browser-data";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Defer so play/teams pages can open IndexedDB first without racing upgrade.
    const timer = window.setTimeout(() => {
      void hydrateFromServerIfEmpty();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return <>{children}</>;
}
