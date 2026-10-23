"use client";

import { useEffect } from "react";

/** Share links land here for their preview metadata, then open in the app. */
export default function Redirect({ to }: { to: string }) {
  useEffect(() => location.replace(to), [to]);
  return (
    <main className="grid h-dvh place-items-center bg-ink text-parchment">
      <a href={to} className="font-display text-xl italic text-muted hover:text-parchment">
        Opening Types &amp; Shadows…
      </a>
    </main>
  );
}
