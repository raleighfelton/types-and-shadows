"use client";

import { type Entry, type ThemeId, THEMES, TIERS } from "@/lib/typology";
import { useMemo } from "react";
import { type Canon, type TranslationId, parsePassage } from "@/lib/bible";
import { Credit } from "./Controls";
import Passage, { useVerses } from "./Passage";

export function TypeEntry({
  canon,
  translation,
  entries,
  index,
  onOpenEntry,
  onRead,
}: {
  canon: Canon;
  translation: TranslationId;
  entries: Entry[];
  index: number;
  onOpenEntry: (i: number | null) => void;
  onRead: (idx: number) => void;
}) {
  const e = entries[index];
  const theme = THEMES[e.theme];
  const anchor: [number, number] = [e.anchor.from, e.anchor.to];

  return (
    <article className="flex h-full min-h-0 flex-col" style={{ "--c": theme.color } as React.CSSProperties}>
      <header className="border-b border-parchment/10 px-7 pb-5 pt-6">
        <div className="mb-3 flex items-center justify-between pr-9">
          <button type="button" className="smallcaps text-xs text-muted hover:text-parchment" onClick={() => onOpenEntry(null)}>
            ‹ All types
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              className="icon-btn"
              aria-label="Previous type"
              onClick={() => onOpenEntry((index - 1 + entries.length) % entries.length)}
            >
              ‹
            </button>
            <button type="button" className="icon-btn" aria-label="Next type" onClick={() => onOpenEntry((index + 1) % entries.length)}>
              ›
            </button>
          </div>
        </div>
        <div className="smallcaps flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="text-[var(--ct)]">{theme.label}</span>
          <span className="text-muted">·</span>
          <span className="text-soft" title={TIERS[e.tier].description}>
            {TIERS[e.tier].label}
          </span>
          {e.word && (
            <>
              <span className="text-muted">·</span>
              <span className="normal-case italic tracking-normal text-muted">{e.word}</span>
            </>
          )}
        </div>
        <h2 className="mt-2 font-display text-[2.1rem] leading-[1.05] text-parchment">{e.title}</h2>
        <p className="mt-3 text-[calc(16px*var(--read-scale))] leading-relaxed text-soft">{e.note}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
        <Side label="Shadow" sub="Old Testament">
          {e.shadow.map((p) => (
            <Block key={p.label} label={p.label} onRead={() => onRead(p.from)}>
              <Passage canon={canon} translation={translation} from={p.from} to={p.to} />
            </Block>
          ))}
        </Side>
        <div className="my-6 flex items-center gap-3 text-[var(--cc)]" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--cc)] opacity-50" />
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M7 1v12M2 8l5 5 5-5" stroke="currentColor" fill="none" strokeWidth="1.2" />
          </svg>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--cc)] opacity-50" />
        </div>
        <Side label="Substance" sub="New Testament">
          {e.substance.map((p) => (
            <Block key={p.label} label={p.label} onRead={() => onRead(p.from)} anchor={p.from <= anchor[0] && anchor[0] <= p.to}>
              <Passage canon={canon} translation={translation} from={p.from} to={p.to} highlight={anchor} />
            </Block>
          ))}
        </Side>
        <p className="mt-8 border-t border-parchment/10 pt-4 text-[12px] italic leading-snug text-muted">
          Highlighted: the New Testament words that make this connection. Draft entry, awaiting theological review.
        </p>
      </div>
    </article>
  );
}

function Side({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="font-display text-2xl italic text-parchment">{label}</h3>
        <span className="smallcaps text-[11px] text-muted">{sub}</span>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Block({
  label,
  anchor,
  onRead,
  children,
}: {
  label: string;
  anchor?: boolean;
  onRead: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button type="button" onClick={onRead} className="group mb-1 flex items-baseline gap-2">
        <span className={`smallcaps text-[13px] ${anchor ? "text-[var(--ct)]" : "text-soft"} group-hover:text-parchment`}>
          {label}
        </span>
        <span className="text-[11px] italic text-parchment/0 transition-colors group-hover:text-soft">read in context</span>
      </button>
      {children}
    </div>
  );
}

export function TypeIndex({
  canon,
  translation,
  entries,
  themeFilter,
  onTheme,
  onOpenEntry,
  showCredit,
}: {
  canon: Canon;
  translation: TranslationId;
  /** Phones show the credit here; desktop shows it in the page footer. */
  showCredit?: boolean;
  entries: Entry[];
  themeFilter: ThemeId | null;
  onTheme: (t: ThemeId | null) => void;
  onOpenEntry: (i: number) => void;
}) {
  const themes = Object.keys(THEMES) as ThemeId[];
  const col = useMemo(() => parsePassage(canon, "Col 2:17"), [canon]);
  const motto = useVerses(canon, translation, col.from, col.to);
  return (
    <div className="h-full overflow-y-auto px-7 pb-10 pt-6">
      <p className="font-display text-[1.65rem] leading-snug text-parchment">
        “{motto ? motto[0].text.replace(/^[“"]|[”"]$/g, "") : "\u00a0"}”
      </p>
      <p className="smallcaps mt-1 text-xs text-muted">Colossians 2:17 · {translation}</p>

      <p className="mt-6 text-[calc(16px*var(--read-scale))] leading-relaxed text-soft">
        Each colored arc is a connection the New Testament makes itself. Nothing is here on tradition or
        inference alone: every entry points to the verse that states it.
      </p>
      <dl className="mt-5 space-y-3">
        {Object.values(TIERS).map((t) => (
          <div key={t.label} className="grid grid-cols-[5.5rem_1fr] gap-3">
            <dt className="smallcaps pt-[2px] text-[12px] text-gold">{t.label}</dt>
            <dd className="text-[calc(14px*var(--read-scale))] leading-snug text-soft">{t.description}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 space-y-7">
        {themes.map((th) => {
          const list = entries.map((e, i) => [e, i] as const).filter(([e]) => e.theme === th);
          if (!list.length) return null;
          const active = themeFilter === th;
          return (
            <section key={th} style={{ "--c": THEMES[th].color } as React.CSSProperties}>
              <button
                type="button"
                onClick={() => onTheme(active ? null : th)}
                className={`smallcaps mb-2 flex w-full items-center gap-2 text-left text-[12px] ${
                  themeFilter && !active ? "text-muted" : "text-parchment/80"
                } hover:text-parchment`}
              >
                <i className="h-2 w-2 rounded-full bg-[var(--cc)]" />
                {THEMES[th].label}
                <span className="text-muted">{list.length}</span>
                {active && <span className="ml-auto text-[10px] text-muted">showing only · clear</span>}
              </button>
              <ul>
                {list.map(([e, i]) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onOpenEntry(i)}
                      className="group flex w-full items-baseline justify-between gap-4 border-b border-parchment/[0.06] py-[7px] text-left"
                    >
                      <span className="text-[calc(16px*var(--read-scale))] text-parchment/85 group-hover:text-[var(--ct)]">{e.title}</span>
                      <span className="smallcaps shrink-0 text-[10px] text-muted">
                        {e.shadow[0].label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <details className="mt-10 text-[calc(14px*var(--read-scale))] leading-relaxed text-muted">
        <summary className="smallcaps cursor-pointer text-[12px] text-soft hover:text-parchment">
          Why isn&apos;t Joseph here?
        </summary>
        <p className="mt-2">
          Many well-loved types, like Joseph, Boaz, or Rahab&apos;s scarlet cord, are drawn by teachers rather than
          stated in the New Testament. They may be true, but this map only includes connections Scripture makes
          explicitly. If the text doesn&apos;t say it, it isn&apos;t drawn.
        </p>
      </details>

      {showCredit && (
        <p className="mt-10 border-t border-parchment/10 pt-4 text-[12px] italic text-muted">
          <Credit withSource />
        </p>
      )}
    </div>
  );
}
