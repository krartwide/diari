"use client";

import { useEffect } from "react";
import { hydrateFromServerIfEmpty } from "@/lib/browser-data";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Defer so play/teams pages can open IndexedDB first without racing upgrade.
    const timer = window.setTimeout(() => {
      void (async () => {
        await hydrateFromServerIfEmpty();
        const { syncQuietly } = await import("@/lib/sync-client");
        await syncQuietly();
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return <>{children}</>;
}
