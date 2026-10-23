"use client";

import { useEffect, useState } from "react";

/** Tracks a media query. null until mounted, so the first paint never guesses wrong. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}
