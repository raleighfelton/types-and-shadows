"use client";

// Header controls shared by the desktop (Explorer) and phone (MobileShell) layouts.
import { useState } from "react";
import { type Mode, VOTE_STEPS } from "@/lib/arcs";
import { type Canon, parseQuery, toIndex } from "@/lib/bible";
import InfoTip from "./InfoTip";

export function ModeTabs({ mode, onMode, compact }: { mode: Mode; onMode: (m: Mode) => void; compact?: boolean }) {
  const tabs = [
    ["types", compact ? "Types" : "Types & Shadows"],
    ["all", compact ? "All links" : "Every cross-reference"],
  ] as const;
  return (
    <div role="tablist" className="inline-flex rounded-full border border-parchment/15 p-[3px]">
      {tabs.map(([m, label]) => (
        <button
          key={m}
          role="tab"
          type="button"
          aria-selected={mode === m}
          onClick={() => onMode(m)}
          className={`smallcaps rounded-full text-[12px] transition-colors ${compact ? "px-3 py-[5px]" : "px-4 py-[6px]"} ${
            mode === m ? "bg-gold text-ink" : "text-soft hover:text-parchment"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function VoteFilter({
  step,
  onStep,
  visible,
  compact,
}: {
  step: number;
  onStep: (step: number) => void;
  visible: number;
  compact?: boolean;
}) {
  const min = VOTE_STEPS[step];
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={VOTE_STEPS.length - 1}
        value={step}
        onChange={(e) => onStep(+e.target.value)}
        aria-label="Minimum votes"
        className={`${compact ? "w-24" : "w-28"} accent-[var(--color-gold)]`}
      />
      <span className={`smallcaps text-muted ${compact ? "text-[11px]" : "text-[12px]"}`}>
        {visible.toLocaleString()} {compact ? "links" : "connections"} · {min}+ {min === 1 ? "vote" : "votes"}
      </span>
      <InfoTip label="What does this slider do?" align={compact ? "right" : "left"}>
        Each cross-reference has votes from OpenBible.info readers who found it helpful. Slide right to hide weaker
        links and keep only the most agreed-on ones. Slide left to see everything.
      </InfoTip>
    </div>
  );
}

/** "Go to · John 3:14": parses a free-text reference and opens it. */
export function PassageSearch({
  canon,
  onGo,
  className = "",
  inputClassName = "",
}: {
  canon: Canon;
  onGo: (idx: number) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const r = parseQuery(canon, query);
        if (!r) return setError(true);
        setError(false);
        setQuery("");
        onGo(toIndex(canon, r));
      }}
    >
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setError(false);
        }}
        placeholder="Go to · John 3:14"
        aria-label="Go to a passage"
        aria-invalid={error}
        enterKeyHint="go"
        className={`control bg-transparent placeholder:text-muted focus:outline-none ${error ? "border-error/70" : ""} ${inputClassName}`}
      />
    </form>
  );
}

/** "Whole Bible › Genesis" */
export function ZoomTrail({ name, onBack, size = "sm" }: { name: string; onBack: () => void; size?: "sm" | "lg" }) {
  return (
    <nav
      aria-label="Zoom level"
      className={`flex items-baseline whitespace-nowrap font-display leading-none ${size === "lg" ? "gap-3 text-[1.75rem]" : "gap-2 text-xl"}`}
    >
      <button type="button" onClick={onBack} className="italic text-muted transition-colors hover:text-parchment">
        Whole Bible
      </button>
      <span className="text-muted">›</span>
      <span className="text-gold">{name}</span>
    </nav>
  );
}
