"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { APP_LIVE, APP_STORE_URL } from "@/lib/site";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Sheet } from "./Controls";

// The iPhone and iPad app: a short silent loop of it in use, and the way to
// get it. Before the app is on the store (APP_LIVE off) the same sheet says
// "coming soon" and carries no link.
const LOOP = APP_LIVE ? "/app/loop" : "/app/loop-soon";

export default function AppSheet({ onClose }: { onClose: () => void }) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  useEffect(() => track("app_sheet_opened", { live: APP_LIVE }), []);
  return (
    <Sheet title="Types & Shadows for iPhone" onClose={onClose} wide>
      {/* 16:9, drawn on the site's own ink; the outline keeps its edge on any palette. */}
      <video
        className="aspect-video w-full rounded-lg bg-[#0e1220] outline outline-1 -outline-offset-1 outline-white/10"
        poster="/app/poster.jpg"
        autoPlay={still === false}
        controls={still === true}
        loop
        muted
        playsInline
        preload="metadata"
        aria-label="The app on an iPhone: the map, a chapter, a verse and its connections, and a share image"
      >
        <source src={`${LOOP}.webm`} type="video/webm" />
        <source src={`${LOOP}.mp4`} type="video/mp4" />
      </video>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="max-w-[24rem] text-[15px] leading-snug text-soft [text-wrap:pretty]">
          The map, the types and the reader, made for your phone. Free, with no account, and it works offline.
        </p>
        {APP_LIVE ? (
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("app_store_clicked")}
            className="smallcaps grid h-10 shrink-0 place-items-center rounded-full bg-gold px-5 text-[13px] text-ink transition-[transform,background-color] duration-150 hover:bg-parchment active:scale-[0.98]"
          >
            Free on the App Store
          </a>
        ) : (
          <span className="smallcaps grid h-10 shrink-0 place-items-center rounded-full border border-parchment/20 px-5 text-[13px] text-soft">
            Coming soon to the App Store
          </span>
        )}
      </div>
      <p className="text-meta italic text-muted">For iPhone and iPad.</p>
    </Sheet>
  );
}
