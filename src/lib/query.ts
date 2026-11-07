"use client";

import { useEffect, useState } from "react";

/** Read a query param without useSearchParams (avoids Suspense bailout on static/Pages). */
export function useQueryParam(name: string) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get(name) ?? "";
  });

  useEffect(() => {
    const sync = () => {
      setValue(new URLSearchParams(window.location.search).get(name) ?? "");
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [name]);

  return value;
}
