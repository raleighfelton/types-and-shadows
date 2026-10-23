"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Canon,
  type TranslationId,
  type XRef,
  formatRange,
  loadBookText,
  refId,
  toIndex,
} from "@/lib/bible";
import { type Entry, THEMES, entriesTouching } from "@/lib/typology";
import { VerseText, useVerses } from "./Passage";
import ShareSheet from "./ShareSheet";

type Props = {
  canon: Canon;
  translation: TranslationId;
  book: number;
  chapter: number;
  focus: number | null;
  xrefs: XRef[] | null;
  entries: Entry[];
  onFocus: (idx: number | null) => void;
  onGo: (idx: number) => void;
  onOpenEntry: (i: number) => void;
  /** Selected cross-reference target (highlighted in the link color on the map). */
  selected: number | null;
  onSelect: (to: number | null) => void;
  /** Hover preview of a connection (desktop only). */
  onPreview?: (to: number | null) => void;
  onExploreBook: (book: number) => void;
};

const PAGE = 10;

export default function Reader(p: Props) {
  const { canon, translation, book, chapter, focus, xrefs, entries } = p;
  const b = canon.books[book];
  const [text, setText] = useState<string[] | null>(null);
  const [shown, setShown] = useState(PAGE);
  const scroller = useRef<HTMLDivElement>(null);
  const first = toIndex(canon, { book, chapter, verse: 1 });

  useEffect(() => {
    let live = true;
    setText(null);
    loadBookText(translation, book).then((t) => live && setText(t[chapter - 1]));
    return () => {
      live = false;
    };
  }, [translation, book, chapter]);

  useEffect(() => setShown(PAGE), [focus]);

  // A new chapter starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [book, chapter]);

  // Keep the focused verse in view.
  useEffect(() => {
    if (focus === null || !text) return;
    scroller.current
      ?.querySelector(`[data-v="${focus}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus, text]);

  // Which verses in this chapter belong to a curated type.
  const typed = useMemo(() => {
    const m = new Map<number, string>();
    if (!text) return m;
    for (let i = 0; i < text.length; i++) {
      const hit = entriesTouching(entries, first + i);
      if (hit.length) m.set(first + i, THEMES[entries[hit[0]].theme].color);
    }
    return m;
  }, [entries, first, text]);

  const focusEntries = focus !== null ? entriesTouching(entries, focus) : [];
  const nCh = b.chapters.length;
  const go = (bk: number, ch: number) => p.onGo(toIndex(canon, { book: bk, chapter: ch, verse: 1 }));
  const prev = () => (chapter > 1 ? go(book, chapter - 1) : book > 0 && go(book - 1, canon.books[book - 1].chapters.length));
  const next = () => (chapter < nCh ? go(book, chapter + 1) : book < 65 && go(book + 1, 1));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-end justify-between gap-4 border-b border-parchment/10 pb-4 pl-7 pr-14 pt-6">
        <div>
          <div className="smallcaps text-xs text-muted">{b.nt ? "New Testament" : "Old Testament"}</div>
          <h2 className="font-display text-[2.4rem] leading-none text-parchment">
            {b.name} <span className="text-gold">{chapter}</span>
          </h2>
          <button
            type="button"
            onClick={() => p.onExploreBook(book)}
            className="smallcaps mt-2 text-meta text-muted hover:text-gold"
          >
            Where {b.name} connects ›
          </button>
        </div>
        <div className="flex gap-1 pb-1">
          <button type="button" className="icon-btn" onClick={prev} aria-label="Previous chapter">
            ‹
          </button>
          <button type="button" className="icon-btn" onClick={next} aria-label="Next chapter">
            ›
          </button>
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
        {!text ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-4 animate-pulse rounded-sm bg-parchment/5" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
            ))}
          </div>
        ) : (
          <p className="scripture reading">
            {text.map((t, i) => {
              const idx = first + i;
              const mark = typed.get(idx);
              return (
                <span
                  key={idx}
                  data-v={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => p.onFocus(focus === idx ? null : idx)}
                  onKeyDown={(e) => e.key === "Enter" && p.onFocus(focus === idx ? null : idx)}
                  className={`verse ${focus === idx ? "is-focus" : ""}`}
                >
                  <sup>
                    {mark && <i className="type-dot" style={{ background: mark }} />}
                    {i + 1}
                  </sup>
                  <VerseText text={t} />{" "}
                </span>
              );
            })}
          </p>
        )}
      </div>

      {focus !== null && (
        <section className="max-h-[44%] min-h-0 md:max-h-[52%] overflow-y-auto border-t border-parchment/10 bg-ink-2/60 px-7 py-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="smallcaps text-sm text-soft">
              From <span className="text-parchment">{formatRange(canon, focus, focus)}</span>
            </h3>
            <button type="button" className="smallcaps text-xs text-muted hover:text-parchment" onClick={() => p.onFocus(null)}>
              Clear
            </button>
          </div>

          {focusEntries.map((i) => {
            const e = entries[i];
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => p.onOpenEntry(i)}
                className="type-link mb-3 block w-full text-left"
                style={{ "--c": THEMES[e.theme].color } as React.CSSProperties}
              >
                <span className="smallcaps text-meta text-muted">Type &amp; shadow · {THEMES[e.theme].label}</span>
                <span className="block font-display text-xl text-parchment">{e.title} →</span>
              </button>
            );
          })}

          {!xrefs ? (
            <p className="text-sm italic text-muted">Loading connections…</p>
          ) : xrefs.length === 0 ? (
            <p className="text-sm italic text-muted">No cross-references for this verse.</p>
          ) : (
            <>
              <ol className="space-y-1">
                {xrefs.slice(0, shown).map(([a, z, votes]) => (
                  <XrefItem
                    key={`${a}-${z}`}
                    canon={canon}
                    translation={translation}
                    origin={focus!}
                    from={a}
                    to={z}
                    votes={votes}
                    selected={p.selected === a}
                    onSelect={() => p.onSelect(p.selected === a ? null : a)}
                    onPreview={p.onPreview}
                    onGo={p.onGo}
                  />
                ))}
              </ol>
              {xrefs.length > shown && (
                <button
                  type="button"
                  className="smallcaps mt-4 text-xs text-gold hover:text-parchment"
                  onClick={() => setShown((s) => s + PAGE * 2)}
                >
                  Show more · {xrefs.length - shown} left
                </button>
              )}
              <p className="mt-4 text-meta italic leading-snug text-muted">
                Cross-references are community-ranked by OpenBible.info. They are study aids, not part of the curated types.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function XrefItem({
  canon,
  translation,
  origin,
  from,
  to,
  votes,
  selected,
  onSelect,
  onPreview,
  onGo,
}: {
  canon: Canon;
  translation: TranslationId;
  /** The focused verse this cross-reference comes from. */
  origin: number;
  from: number;
  to: number;
  votes: number;
  selected: boolean;
  onSelect: () => void;
  onPreview?: (to: number | null) => void;
  onGo: (idx: number) => void;
}) {
  // Collapsed: a short preview. Selected: the whole passage (capped for very long ranges).
  const end = selected ? Math.min(to, from + 11) : Math.min(to, from + 2);
  const verses = useVerses(canon, translation, from, end);
  const [sharing, setSharing] = useState(false);
  return (
    <li
      className={`xref group ${selected ? "is-selected" : ""}`}
      onPointerEnter={() => onPreview?.(from)}
      onPointerLeave={() => onPreview?.(null)}
    >
      <button type="button" onClick={onSelect} aria-pressed={selected} className="block w-full text-left">
        <span className="flex items-baseline justify-between gap-3">
          <span className="xref-ref font-display text-lg">{formatRange(canon, from, to)}</span>
          <span className="smallcaps shrink-0 text-meta text-muted" title="OpenBible.info votes">
            {votes} {votes === 1 ? "vote" : "votes"}
          </span>
        </span>
        {selected ? (
          <span className="mt-1 block text-[calc(16px*var(--read-scale))] leading-relaxed text-parchment/90">
            {verses
              ? verses.map((v) => (
                  <span key={v.n}>
                    {to > from && <sup className="mr-[0.2em] text-[0.62em] text-[var(--link)]/80">{v.n}</sup>}
                    {v.text}{" "}
                  </span>
                ))
              : "…"}
            {to > end && <span className="italic text-muted"> continues in context…</span>}
          </span>
        ) : (
          <span className="line-clamp-2 text-[calc(15px*var(--read-scale))] leading-snug text-soft">
            {verses ? verses.map((v) => v.text).join(" ") + (to > end ? " …" : "") : "…"}
          </span>
        )}
      </button>
      {selected && (
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          <button type="button" onClick={() => onGo(from)} className="smallcaps text-meta text-[var(--link)] hover:text-parchment">
            Read {formatRange(canon, from, from)} in context ›
          </button>
          <button type="button" onClick={() => setSharing(true)} className="smallcaps text-meta text-[var(--link)] hover:text-parchment">
            Share this connection
          </button>
        </div>
      )}
      {sharing && (
        <ShareSheet
          target={{ a: refId(canon, origin), b: refId(canon, from), be: to > from ? refId(canon, to) : undefined }}
          name={`${formatRange(canon, origin, origin)} and ${formatRange(canon, from, to)}`}
          translation={translation}
          onClose={() => setSharing(false)}
        />
      )}
    </li>
  );
}
