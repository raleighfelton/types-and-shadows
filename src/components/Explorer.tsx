"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Mode, VOTE_STEPS, filterArcs } from "@/lib/arcs";
import {
  type Canon,
  type TranslationId,
  type XRef,
  TRANSLATIONS,
  clampRef,
  fromIndex,
  loadArcs,
  loadCanon,
  loadXrefs,
  toIndex,
} from "@/lib/bible";
import { useReadingSettings } from "@/lib/settings";
import { type Entry, type ThemeId, resolveEntries, typeArcs as buildTypeArcs } from "@/lib/typology";
import { useMediaQuery } from "@/lib/useMediaQuery";
import ArcCanvas from "./ArcCanvas";
import BookPicker from "./BookPicker";
import BookView from "./BookView";
import { ModeTabs, PassageSearch, VoteFilter } from "./Controls";
import MobileShell, { type Tab } from "./MobileShell";
import Reader from "./Reader";
import ReadingSettings from "./ReadingSettings";
import TranslationPicker from "./TranslationPicker";
import { TypeEntry, TypeIndex } from "./TypePanel";

type Panel = { kind: "reader"; at: number } | { kind: "entry"; i: number } | { kind: "index" } | null;

export default function Explorer() {
  const [canon, setCanon] = useState<Canon | null>(null);
  const [arcs, setArcs] = useState<Int16Array | null>(null);
  const [mode, setMode] = useState<Mode>("types");
  const [translation, setTranslation] = useState<TranslationId>("BSB");
  const [voteStep, setVoteStep] = useState(3);
  const [themeFilter, setThemeFilter] = useState<ThemeId | null>(null);
  const [panel, setPanel] = useState<Panel>({ kind: "index" });
  const [focus, setFocusState] = useState<number | null>(null);
  const [focusXrefs, setFocusXrefs] = useState<XRef[] | null>(null);
  const [book, setBook] = useState<number | null>(null); // null = whole Bible
  const [pinned, setPinned] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const reading = useReadingSettings();
  const [tab, setTab] = useState<Tab>("map");
  // On phones, Read and Types are separate tabs, so each remembers its place.
  const [lastReader, setLastReader] = useState<number | null>(null);
  const [entryView, setEntryView] = useState<number | null>(null);

  useEffect(() => {
    loadCanon().then(setCanon);
    loadArcs().then(setArcs);
    const saved = localStorage.getItem("translation");
    if (TRANSLATIONS.some((t) => t.id === saved && t.available)) setTranslation(saved as TranslationId);
  }, []);

  const entries: Entry[] = useMemo(() => (canon ? resolveEntries(canon) : []), [canon]);
  const typeArcs = useMemo(() => buildTypeArcs(entries), [entries]);

  // Load cross-references for the focused verse.
  useEffect(() => {
    if (!canon || focus === null) return setFocusXrefs(null);
    let live = true;
    const r = fromIndex(canon, focus);
    loadXrefs(r.book).then((m) => live && setFocusXrefs(m[`${r.chapter}.${r.verse}`] ?? []));
    return () => {
      live = false;
    };
  }, [canon, focus]);

  // A new focus verse clears the selected connection.
  const setFocus = useCallback((idx: number | null) => {
    setFocusState(idx);
    setPinned(null);
    setPreview(null);
  }, []);
  const linkTo = preview ?? pinned;
  const link = useMemo(() => (focus !== null && linkTo !== null ? { from: focus, to: linkTo } : null), [focus, linkTo]);

  const openChapter = useCallback(
    (idx: number) => {
      setPanel({ kind: "reader", at: idx });
      setLastReader(idx);
      setFocus(null);
      setTab("read");
    },
    [setFocus],
  );

  const openVerse = useCallback(
    (idx: number) => {
      setPanel({ kind: "reader", at: idx });
      setLastReader(idx);
      setFocus(idx);
      setTab("read");
    },
    [setFocus],
  );

  const openEntry = useCallback(
    (i: number | null) => {
      setFocus(null);
      setPanel(i === null ? { kind: "index" } : { kind: "entry", i });
      setEntryView(i);
      if (i !== null) setMode("types");
      setTab("types");
    },
    [setFocus],
  );

  const exploreBook = useCallback((b: number | null) => {
    setBook(b);
    setTab("map");
  }, []);

  // ---- URL hash: #John.3.16 or #type/serpent ------------------------------
  useEffect(() => {
    if (!canon || !entries.length) return;
    const apply = () => {
      for (const part of decodeURIComponent(location.hash.slice(1)).split("&")) {
        if (part.startsWith("type/")) {
          const i = entries.findIndex((e) => e.id === part.slice(5));
          if (i >= 0) openEntry(i);
          continue;
        }
        if (part.startsWith("book/")) {
          const i = canon.books.findIndex((b) => b.osis === part.slice(5));
          if (i >= 0) exploreBook(i);
          continue;
        }
        const [bk, c, v] = part.split(".");
        const bi = canon.books.findIndex((b) => b.osis === bk);
        if (bi >= 0 && +c >= 1 && +c <= canon.books[bi].chapters.length) {
          setMode("all");
          openVerse(toIndex(canon, clampRef(canon, bi, +c, +v)));
        }
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [canon, entries, openEntry, openVerse, exploreBook]);

  useEffect(() => {
    if (!canon) return;
    const parts: string[] = [];
    if (book !== null) parts.push(`book/${canon.books[book].osis}`);
    if (panel?.kind === "entry") parts.push(`type/${entries[panel.i].id}`);
    else if (panel?.kind === "reader") {
      const r = fromIndex(canon, focus ?? panel.at);
      parts.push(`${canon.books[r.book].osis}.${r.chapter}${focus !== null ? `.${r.verse}` : ""}`);
    }
    history.replaceState(null, "", parts.length ? `#${parts.join("&")}` : location.pathname);
  }, [canon, panel, focus, entries, book]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (pinned !== null) setPinned(null);
      else if (focus !== null) setFocus(null);
      else if (book !== null) setBook(null);
      else setPanel(mode === "types" ? { kind: "index" } : null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, mode, pinned, book, setFocus]);

  function changeTranslation(t: TranslationId) {
    setTranslation(t);
    localStorage.setItem("translation", t);
  }

  function changeMode(m: Mode) {
    setMode(m);
    if (m === "types" && (!panel || panel.kind === "reader") && focus === null) setPanel({ kind: "index" });
    if (m === "all" && panel?.kind !== "reader") setPanel(null);
  }

  const minVotes = VOTE_STEPS[voteStep];
  const visibleArcs = canon && arcs ? filterArcs(canon, arcs, minVotes).keep.length : 0;

  const readerAt = panel?.kind === "reader" && canon ? fromIndex(canon, panel.at) : null;

  if (isMobile === null || (isMobile && !canon)) return <main className="h-dvh bg-ink" />;
  if (isMobile && canon) {
    return (
      <MobileShell
        theme={reading.theme}
        palette={reading.settings.palette}
        settingsButton={<ReadingSettings settings={reading.settings} onChange={reading.update} />}
        canon={canon}
        arcs={arcs}
        entries={entries}
        typeArcs={typeArcs}
        tab={tab}
        onTab={setTab}
        mode={mode}
        onMode={changeMode}
        translation={translation}
        onTranslation={changeTranslation}
        voteStep={voteStep}
        onVoteStep={setVoteStep}
        visibleArcs={visibleArcs}
        themeFilter={themeFilter}
        onTheme={setThemeFilter}
        book={book}
        onBook={exploreBook}
        focus={focus}
        onFocus={setFocus}
        focusXrefs={focusXrefs}
        link={link}
        pinned={pinned}
        onPin={setPinned}
        readerAt={lastReader !== null ? fromIndex(canon, lastReader) : null}
        entryView={entryView}
        onOpenVerse={openVerse}
        onOpenChapter={openChapter}
        onOpenEntry={openEntry}
      />
    );
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ink text-parchment md:flex-row">
      <div className="relative min-w-0 flex-1">
        {canon && book !== null && (
          <BookView
            theme={reading.theme}
            palette={reading.settings.palette}
            canon={canon}
            book={book}
            minVotes={minVotes}
            mode={mode}
            entries={entries}
            themeFilter={themeFilter}
            focusVerse={focus}
            focusXrefs={focusXrefs}
            link={link}
            activeChapter={readerAt && readerAt.book === book ? readerAt.chapter - 1 : null}
            onOpenChapter={openChapter}
            onOpenVerse={openVerse}
            onPickBook={setBook}
            onPickEntry={openEntry}
            onBack={() => setBook(null)}
          />
        )}
        {canon && arcs && book === null && (
          <ArcCanvas
            theme={reading.theme}
            palette={reading.settings.palette}
            canon={canon}
            arcs={arcs}
            minVotes={minVotes}
            mode={mode}
            entries={entries}
            typeArcs={typeArcs}
            themeFilter={themeFilter}
            focusVerse={focus}
            focusXrefs={focusXrefs}
            focusEntry={panel?.kind === "entry" ? panel.i : null}
            link={link}
            onPickVerse={openVerse}
            onPickEntry={openEntry}
            onPickBook={setBook}
          />
        )}
        {(!canon || !arcs) && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="font-display text-xl italic text-muted">Gathering 31,102 verses…</p>
          </div>
        )}

        {/* Title + mode */}
        <header className="pointer-events-none absolute left-0 top-0 flex w-full flex-wrap items-start justify-between gap-3 px-5 pt-5 md:gap-6 md:px-[3vw] md:pt-7">
          <div className="pointer-events-auto">
            <h1 className="font-display text-[clamp(1.7rem,3.4vw,3.25rem)] font-medium italic leading-[0.95] tracking-[-0.01em]">
              Types <span className="not-italic text-gold">&amp;</span> Shadows
            </h1>
            <p className="smallcaps mt-2 hidden text-[12px] text-muted sm:block">
              The Bible is the original hypertext
            </p>
            <div className="mt-3 md:mt-5">
              <ModeTabs mode={mode} onMode={changeMode} />
            </div>
            {mode === "all" && arcs && (
              <div className="mt-4">
                <VoteFilter step={voteStep} onStep={setVoteStep} visible={visibleArcs} />
              </div>
            )}
          </div>

          <div className="pointer-events-auto absolute right-5 top-5 flex items-center gap-2 md:static">
            {canon && <PassageSearch canon={canon} onGo={openVerse} className="hidden sm:block" inputClassName="w-44 focus:w-56" />}
            {canon && <BookPicker canon={canon} current={book} onPick={setBook} />}
            <TranslationPicker value={translation} onChange={changeTranslation} />
            <ReadingSettings settings={reading.settings} onChange={reading.update} />
          </div>
        </header>

        {book === null && !panel && (
          <p className="pointer-events-none absolute bottom-4 right-[3vw] hidden text-right font-display text-[15px] italic text-muted lg:block">
            “I have set My rainbow in the clouds, and it will be a sign of the covenant between Me and the earth.”
            <span className="smallcaps ml-3 not-italic font-serif text-[11px] text-muted">Genesis 9:13</span>
          </p>
        )}
        <p className="pointer-events-auto absolute bottom-4 left-[3vw] hidden text-[11px] italic text-muted md:block">
          Cross-references{" "}
          <a className="underline decoration-parchment/20 hover:text-parchment" href="https://www.openbible.info/labs/cross-references/">
            OpenBible.info
          </a>{" "}
          (CC BY) · Scripture texts in the public domain
        </p>
      </div>

      {panel && canon && (
        <aside className="panel h-[56dvh] shrink-0 border-t border-parchment/10 bg-ink-2 md:h-auto md:w-[440px] md:border-l md:border-t-0 xl:w-[480px]">
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => {
              setFocus(null);
              setPanel(null);
            }}
            className="icon-btn absolute right-4 top-4 z-10"
          >
            ×
          </button>
          {panel.kind === "reader" && readerAt && (
            <Reader
              canon={canon}
              translation={translation}
              book={readerAt.book}
              chapter={readerAt.chapter}
              focus={focus}
              xrefs={focusXrefs}
              entries={entries}
              onFocus={setFocus}
              onGo={openVerse}
              onOpenEntry={openEntry}
              selected={pinned}
              onSelect={setPinned}
              onPreview={setPreview}
              onExploreBook={setBook}
            />
          )}
          {panel.kind === "entry" && (
            <TypeEntry
              canon={canon}
              translation={translation}
              entries={entries}
              index={panel.i}
              onOpenEntry={openEntry}
              onRead={openVerse}
            />
          )}
          {panel.kind === "index" && (
            <TypeIndex canon={canon} translation={translation} entries={entries} themeFilter={themeFilter} onTheme={setThemeFilter} onOpenEntry={openEntry} />
          )}
        </aside>
      )}
    </main>
  );
}
