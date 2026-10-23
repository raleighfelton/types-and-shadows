"use client";

// Controls shared by the desktop (Explorer) and phone (MobileShell) layouts.
import { useState } from "react";
import { createPortal } from "react-dom";
import { type Mode, VOTE_STEPS } from "@/lib/arcs";
import { type Canon, parseQuery, toIndex } from "@/lib/bible";
import { AUTHOR_URL, SOURCE_URL } from "@/lib/site";
import { useEscape } from "@/lib/usePopover";
import InfoTip from "./InfoTip";

/** A row of mutually exclusive options in a pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  role,
  size = "md",
  stretch,
}: {
  options: readonly (readonly [T, string, string?])[]; // [value, label, title]
  value: T;
  onChange: (v: T) => void;
  /** "tablist" for view switches; otherwise buttons with aria-pressed. */
  role?: "tablist";
  size?: "sm" | "md";
  stretch?: boolean;
}) {
  return (
    <div role={role} className={`${stretch ? "flex" : "inline-flex"} rounded-full border border-parchment/15 p-[3px]`}>
      {options.map(([v, label, title]) => (
        <button
          key={v}
          type="button"
          title={title}
          role={role ? "tab" : undefined}
          aria-selected={role ? value === v : undefined}
          aria-pressed={role ? undefined : value === v}
          onClick={() => onChange(v)}
          className={`rounded-full transition-colors ${stretch ? "flex-1" : ""} ${
            size === "sm" ? "smallcaps px-3 py-[5px] text-meta" : "px-4 py-[6px] text-[13px]"
          } ${value === v ? "bg-gold text-ink" : "text-soft hover:text-parchment"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const MODE_OPTIONS = [
  ["types", "Types & Shadows"],
  ["all", "Every cross-reference"],
] as const;
export const THEME_OPTIONS = [
  ["dark", "Dark"],
  ["light", "Light"],
] as const;

export function ModeTabs({ mode, onMode, compact }: { mode: Mode; onMode: (m: Mode) => void; compact?: boolean }) {
  return (
    <Segmented
      role="tablist"
      size="sm"
      value={mode}
      onChange={onMode}
      options={
        compact
          ? [
              ["types", "Types"],
              ["all", "All links"],
            ]
          : MODE_OPTIONS
      }
    />
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
      <span className="smallcaps text-meta text-muted">
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


/** "Made by Raleigh", optionally with a link to the source. */
export function Credit({ withSource }: { withSource?: boolean }) {
  return (
    <>
      Made by{" "}
      <a className="quiet-link" href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
        Raleigh
      </a>
      {withSource && (
        <>
          {" · "}
          <a className="quiet-link" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            open source
          </a>
        </>
      )}
    </>
  );
}

/** Line icons in the site's style (24-unit grid, 1.6 stroke). */
const ICONS = {
  share: "M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
} as const;
export function Icon({ name, size = 15 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Opens the "Download the map" sheet. */
export function DownloadMapButton({ onClick, label }: { onClick: () => void; label?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Download the map"
      title="Download the map as an image"
      className="control flex h-[34px] items-center gap-2 px-3 text-soft hover:text-parchment"
    >
      <Icon name="download" />
      {label && <span className="smallcaps text-meta">Download</span>}
    </button>
  );
}

/** A dialog sheet: bottom sheet on phones, centered card on larger screens. */
export function Sheet({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`popover flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl p-5 md:rounded-xl ${
          wide ? "max-w-[40rem]" : "max-w-[34rem]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-parchment">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="icon-btn">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Framed preview area (with a loading shimmer): as large as fits both the sheet's width and `maxHeight`, at the given aspect (width / height). */
export function PreviewFrame({ aspect, maxHeight, children }: { aspect: number; maxHeight: string; children?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-lg bg-ink p-3">
      <div style={{ aspectRatio: aspect, width: `min(100%, calc(${maxHeight} * ${aspect}))` }}>
        {children ?? <div className="h-full w-full animate-pulse rounded-md bg-parchment/5" />}
      </div>
    </div>
  );
}
