"use client";

import { type Mode, VOTE_STEPS } from "@/lib/arcs";
import { type Canon, type TranslationId, type VerseRef, type XRef, parseQuery, toIndex } from "@/lib/bible";
import type { Theme } from "@/lib/palette";
import type { PaletteId } from "@/lib/settingsConfig";
import type { Entry, ThemeId, TypeArc } from "@/lib/typology";
import ArcCanvas from "./ArcCanvas";
import BookPicker from "./BookPicker";
import BookView from "./BookView";
import { ModeTabs, PassageSearch, VoteFilter, ZoomTrail } from "./Controls";
import Reader from "./Reader";
import TranslationPicker from "./TranslationPicker";
import { TypeEntry, TypeIndex } from "./TypePanel";

// Phone layout: one full screen per tab (Map, Types, Read) with a bottom tab
// bar. Read and Types show a mini map so selections stay visible.

export type Tab = "map" | "types" | "read";

type Props = {
  theme: Theme;
  palette: PaletteId;
  settingsButton: React.ReactNode;
  downloadButton: React.ReactNode;
  canon: Canon;
  arcs: Int16Array | null;
  entries: Entry[];
  typeArcs: TypeArc[];
  tab: Tab;
  onTab: (t: Tab) => void;
  mode: Mode;
  onMode: (m: Mode) => void;
  translation: TranslationId;
  onTranslation: (t: TranslationId) => void;
  voteStep: number;
  onVoteStep: (n: number) => void;
  visibleArcs: number;
  themeFilter: ThemeId | null;
  onTheme: (t: ThemeId | null) => void;
  book: number | null;
  onBook: (b: number | null) => void;
  focus: number | null;
  onFocus: (idx: number | null) => void;
  focusXrefs: XRef[] | null;
  link: { from: number; to: number } | null;
  pinned: number | null;
  onPin: (to: number | null) => void;
  readerAt: VerseRef | null;
  entryView: number | null;
  onOpenVerse: (idx: number) => void;
  onOpenChapter: (idx: number) => void;
  onOpenEntry: (i: number | null) => void;
};

const SUGGESTIONS = ["Gen 22", "Exod 12", "Ps 22", "Isa 53", "John 3", "Heb 9"];

export default function MobileShell(p: Props) {
  const { canon, arcs, entries, typeArcs, tab, mode, book } = p;
  const minVotes = VOTE_STEPS[p.voteStep];
  // Suggestions are known-good references.
  const go = (q: string) => p.onOpenVerse(toIndex(canon, parseQuery(canon, q)!));

  const shared = {
    theme: p.theme,
    palette: p.palette,
    canon,
    minVotes,
    entries,
    themeFilter: p.themeFilter,
    focusXrefs: p.focusXrefs,
    link: p.link,
  };

  // Small map strip; tapping it opens the full map.
  const miniMap = (opts: { mode: Mode; focusEntry: number | null; focusVerse: number | null }) =>
    arcs && (
      <button
        type="button"
        onClick={() => p.onTab("map")}
        aria-label="Open the full map"
        className="relative h-[104px] w-full shrink-0 border-b border-parchment/10"
      >
        <ArcCanvas
          {...shared}
          arcs={arcs}
          typeArcs={typeArcs}
          mode={opts.mode}
          focusVerse={opts.focusVerse}
          focusEntry={opts.focusEntry}
          top={8}
          compact
          onPickVerse={() => {}}
          onPickEntry={() => {}}
          onPickBook={() => {}}
        />
      </button>
    );

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ink text-parchment">
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <h1 className="font-display text-[1.45rem] font-medium italic leading-none tracking-[-0.01em]">
          Types <span className="not-italic text-gold">&amp;</span> Shadows
        </h1>
        <div className="flex items-center gap-2">
          <TranslationPicker value={p.translation} onChange={p.onTranslation} />
          {p.settingsButton}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {/* Map stays mounted so its opening bloom only plays once. */}
        <section className={tab === "map" ? "absolute inset-0 flex flex-col" : "hidden"}>
          <div className="flex items-center justify-between gap-2 px-4 pt-1">
            <ModeTabs mode={mode} onMode={p.onMode} compact />
            <div className="flex items-center gap-2">
              {p.downloadButton}
              <BookPicker canon={canon} current={book} onPick={p.onBook} />
            </div>
          </div>

          {book !== null && (
            <div className="px-4 pt-3">
              <ZoomTrail name={canon.books[book].name} onBack={() => p.onBook(null)} />
            </div>
          )}
          {mode === "all" && (
            <div className="px-4 pt-3">
              <VoteFilter step={p.voteStep} onStep={p.onVoteStep} visible={p.visibleArcs} compact />
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            {book !== null ? (
              <BookView
                {...shared}
                book={book}
                mode={mode}
                focusVerse={p.focus}
                activeChapter={p.readerAt && p.readerAt.book === book ? p.readerAt.chapter - 1 : null}
                top={44}
                onOpenChapter={p.onOpenChapter}
                onOpenVerse={p.onOpenVerse}
                onPickBook={p.onBook}
                onPickEntry={p.onOpenEntry}
                onBack={() => p.onBook(null)}
              />
            ) : (
              arcs && (
                <ArcCanvas
                  {...shared}
                  arcs={arcs}
                  typeArcs={typeArcs}
                  mode={mode}
                  focusVerse={p.focus}
                  focusEntry={p.entryView}
                  top={24}
                  onPickVerse={p.onOpenVerse}
                  onPickEntry={p.onOpenEntry}
                  onPickBook={p.onBook}
                />
              )
            )}
          </div>
          <p className="px-4 pb-3 text-center text-[13px] italic leading-snug text-muted">
            {book !== null
              ? "Tap a chapter to read it, or a book on the right to explore it."
              : mode === "types"
                ? "Tap a colored arc to open a type. Tap the line to read a chapter."
                : "Tap the line to read a chapter. Tap a book name to zoom in."}
          </p>
        </section>

        {tab === "types" && (
          <section className="absolute inset-0 flex flex-col">
            {p.entryView !== null ? (
              <>
                {miniMap({ mode: "types", focusEntry: p.entryView, focusVerse: null })}
                <div className="min-h-0 flex-1">
                  <TypeEntry
                    canon={canon}
                    translation={p.translation}
                    entries={entries}
                    index={p.entryView}
                    onOpenEntry={p.onOpenEntry}
                    onRead={p.onOpenVerse}
                  />
                </div>
              </>
            ) : (
              <TypeIndex showCredit canon={canon} translation={p.translation} entries={entries} themeFilter={p.themeFilter} onTheme={p.onTheme} onOpenEntry={p.onOpenEntry} />
            )}
          </section>
        )}

        {tab === "read" && (
          <section className="absolute inset-0 flex flex-col">
            <PassageSearch canon={canon} onGo={p.onOpenVerse} className="px-4 pb-3 pt-1" inputClassName="w-full text-[16px]" />
            {p.readerAt ? (
              <>
                {p.focus !== null && miniMap({ mode: "all", focusEntry: null, focusVerse: p.focus })}
                <div className="min-h-0 flex-1">
                  <Reader
                    canon={canon}
                    translation={p.translation}
                    book={p.readerAt.book}
                    chapter={p.readerAt.chapter}
                    focus={p.focus}
                    xrefs={p.focusXrefs}
                    entries={entries}
                    onFocus={p.onFocus}
                    onGo={p.onOpenVerse}
                    onOpenEntry={p.onOpenEntry}
                    selected={p.pinned}
                    onSelect={p.onPin}
                    onExploreBook={p.onBook}
                  />
                </div>
              </>
            ) : (
              <div className="px-6 pt-10">
                <p className="font-display text-2xl leading-snug text-parchment/80">
                  Tap any chapter on the map to read it, or search above.
                </p>
                <p className="smallcaps mt-8 text-meta text-muted">Good places to start</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => go(s)} className="control text-[15px]">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <nav
        aria-label="Sections"
        className="grid shrink-0 grid-cols-3 border-t border-parchment/10 bg-ink-2 pb-[env(safe-area-inset-bottom)]"
      >
        {(
          [
            ["map", "Map", <path key="i" d="M3 17a9 9 0 0 1 18 0M7 17a5 5 0 0 1 10 0M2 17h20" />],
            ["types", "Types", <path key="i" d="M5 18c2-8 12-8 14 0M5 18h0M19 18h0M12 6v3" />],
            ["read", "Read", <path key="i" d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5zM12 6v13" />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => p.onTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex flex-col items-center gap-1 pb-2 pt-2.5 ${tab === id ? "text-gold" : "text-muted"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              {icon}
            </svg>
            <span className="smallcaps text-meta">{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
