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
import { PassageSearch } from "./Controls";
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
  /**
   * Phone layout: a one-line header with a tap-to-search title, the chapter
   * using the whole screen, and connections in a bottom sheet over the text.
   */
  compact?: boolean;
  /** Shown at the top of the connections sheet (phones): the map strip. */
  sheetMap?: React.ReactNode;
};

const PAGE = 10;
/** Phones: the open connections sheet, and the room its one-line peek takes. */
const SHEET_H = "56dvh";
const SHEET_PEEK = "5rem";

export default function Reader(p: Props) {
  const { canon, translation, book, chapter, focus, xrefs, entries } = p;
  const b = canon.books[book];
  const [text, setText] = useState<string[] | null>(null);
  const [shown, setShown] = useState(PAGE);
  // Phones: the connections sheet is either peeking (one line) or open.
  const [sheetOpen, setSheetOpen] = useState(true);
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

  useEffect(() => {
    setShown(PAGE);
    setSheetOpen(true);
  }, [focus]);

  // A new chapter starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [book, chapter]);

  // Keep the focused verse in view.
  useEffect(() => {
    if (focus === null || !text) return;
    // On phones the sheet covers the lower half, so bring the verse near the top.
    scroller.current
      ?.querySelector(`[data-v="${focus}"]`)
      ?.scrollIntoView({ block: p.compact ? "start" : "center", behavior: "smooth" });
  }, [focus, text, p.compact]);

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

  const connections = (
    <>
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
    </>
  );

  const nav = { prev, next, onExploreBook: () => p.onExploreBook(book), name: b.name, chapter, nt: b.nt };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {p.compact ? <CompactHeader {...nav} canon={canon} onGo={p.onGo} /> : <ReaderHeader {...nav} />}

      <div
        ref={scroller}
        className={`min-h-0 flex-1 overflow-y-auto ${p.compact ? "px-5 pt-4" : "px-7 py-6"}`}
        // Room to scroll the last verses above the connections sheet.
        style={p.compact ? { paddingBottom: focus === null ? "2rem" : sheetOpen ? `calc(${SHEET_H} + 2dvh)` : SHEET_PEEK } : undefined}
      >
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
                  className={`verse scroll-mt-4 ${focus === idx ? "is-focus" : ""}`}
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

      {focus !== null &&
        (p.compact ? (
          <section
            className="sheet absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl border-t border-parchment/15 bg-ink-2"
            style={sheetOpen ? { height: SHEET_H } : undefined}
          >
            <div className="flex items-center gap-2 px-5 pb-2 pt-1.5">
              <button
                type="button"
                onClick={() => setSheetOpen((o) => !o)}
                aria-expanded={sheetOpen}
                className="flex min-w-0 flex-1 flex-col items-start"
              >
                <span aria-hidden className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-parchment/25" />
                <span className="smallcaps text-sm text-soft">
                  From <span className="text-parchment">{formatRange(canon, focus, focus)}</span>
                  {xrefs && <span className="text-muted"> · {xrefs.length} connections</span>}
                  <span className="ml-1 text-muted">{sheetOpen ? "▾" : "▴"}</span>
                </span>
              </button>
              <button type="button" aria-label="Close connections" className="icon-btn is-lg" onClick={() => p.onFocus(null)}>
                ×
              </button>
            </div>
            {/* Hidden, not unmounted, when peeking: keeps the map strip's WebGL context alive. */}
            <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-5 ${sheetOpen ? "" : "hidden"}`}>
              {p.sheetMap}
              {connections}
            </div>
          </section>
        ) : (
          <section className="max-h-[52%] min-h-0 overflow-y-auto border-t border-parchment/10 bg-ink-2/60 px-7 py-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="smallcaps text-sm text-soft">
                From <span className="text-parchment">{formatRange(canon, focus, focus)}</span>
              </h3>
              <button type="button" className="smallcaps text-xs text-muted hover:text-parchment" onClick={() => p.onFocus(null)}>
                Clear
              </button>
            </div>
            {connections}
          </section>
        ))}
    </div>
  );
}

type NavProps = { name: string; chapter: number; nt: boolean; prev: () => void; next: () => void; onExploreBook: () => void };

function ChapterArrows({ prev, next, large }: { prev: () => void; next: () => void; large?: boolean }) {
  const cls = `icon-btn ${large ? "is-lg" : ""}`;
  return (
    <>
      <button type="button" className={cls} onClick={prev} aria-label="Previous chapter">
        ‹
      </button>
      <button type="button" className={cls} onClick={next} aria-label="Next chapter">
        ›
      </button>
    </>
  );
}

function ReaderHeader(n: NavProps) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-parchment/10 pb-4 pl-7 pr-14 pt-6">
      <div>
        <div className="smallcaps text-xs text-muted">{n.nt ? "New Testament" : "Old Testament"}</div>
        <h2 className="font-display text-[2.4rem] leading-none text-parchment">
          {n.name} <span className="text-gold">{n.chapter}</span>
        </h2>
        <button type="button" onClick={n.onExploreBook} className="smallcaps mt-2 text-meta text-muted hover:text-gold">
          Where {n.name} connects ›
        </button>
      </div>
      <div className="flex gap-1 pb-1">
        <ChapterArrows prev={n.prev} next={n.next} />
      </div>
    </header>
  );
}

/** Phones: one line, and the title opens search. */
function CompactHeader({ canon, onGo, ...n }: NavProps & { canon: Canon; onGo: (idx: number) => void }) {
  const [searching, setSearching] = useState(false);
  return (
    <header className="flex items-center justify-between gap-3 border-b border-parchment/10 px-5 py-2.5">
      {searching ? (
        <PassageSearch
          canon={canon}
          onGo={(idx) => {
            setSearching(false);
            onGo(idx);
          }}
          className="flex-1"
          inputClassName="w-full text-[16px]"
          autoFocus
          onBlur={() => setSearching(false)}
        />
      ) : (
        <>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setSearching(true)}
              aria-label={`${n.name} ${n.chapter}. Go to another passage`}
              className="block max-w-full truncate text-left font-display text-[1.7rem] leading-tight text-parchment"
            >
              {n.name} <span className="text-gold">{n.chapter}</span>
              <span className="ml-1.5 align-middle text-base text-muted">⌄</span>
            </button>
            <span className="smallcaps block text-meta text-muted">
              {n.nt ? "New Testament" : "Old Testament"} ·{" "}
              <button type="button" onClick={n.onExploreBook} className="smallcaps text-soft underline decoration-parchment/20">
                where it connects
              </button>
            </span>
          </div>
          <div className="flex shrink-0">
            <ChapterArrows prev={n.prev} next={n.next} large />
          </div>
        </>
      )}
    </header>
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
