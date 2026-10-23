// Verse indexing, reference parsing and lazy data loading.
// Every verse in the Bible has a global index 0..total-1 (KJV versification).

export type Book = {
  osis: string;
  name: string;
  short: string;
  nt: boolean;
  start: number;
  chapters: number[]; // verse counts
  /** Derived in loadCanon: verse count, and global index of the first chapter. */
  verses: number;
  firstChapter: number;
};

export type Canon = {
  total: number;
  books: Book[];
  /** Global verse index where each chapter starts (all chapters, in order). */
  chapterStarts: number[];
  /** Lookups by global verse index. */
  verseBook: Uint8Array;
  verseChapter: Uint16Array;
};

export type VerseRef = { book: number; chapter: number; verse: number };

/** Directed cross-reference: [toStart, toEnd, votes] in global verse indexes. */
export type XRef = [number, number, number];

export const TRANSLATIONS = [
  { id: "KJV", name: "King James Version", note: "1769 · public domain", available: true },
  { id: "BSB", name: "Berean Standard Bible", note: "Modern · public domain", available: true },
  { id: "ASV", name: "American Standard Version", note: "1901 · public domain", available: true },
  { id: "YLT", name: "Young's Literal Translation", note: "1898 · word for word", available: true },
  { id: "Darby", name: "Darby Translation", note: "1890 · public domain", available: true },
  { id: "LSB", name: "Legacy Standard Bible", note: "Needs publisher permission", available: false },
  { id: "ESV", name: "English Standard Version", note: "Needs an API key", available: false },
] as const;

/** Traditional sections of the canon. Acts and Revelation stand alone, so they're not listed. */
export const SECTIONS: { name: string; short?: string; from: string; to: string }[] = [
  { name: "Law", from: "Gen", to: "Deut" },
  { name: "History", from: "Josh", to: "Esth" },
  { name: "Wisdom", from: "Job", to: "Song" },
  { name: "Major Prophets", short: "Prophets", from: "Isa", to: "Dan" },
  { name: "Minor Prophets", short: "Minor", from: "Hos", to: "Mal" },
  { name: "Gospels", from: "Matt", to: "John" },
  { name: "Letters of Paul", short: "Paul", from: "Rom", to: "Phlm" },
  { name: "General Letters", short: "General", from: "Heb", to: "Jude" },
];

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];

const base = "/data";

let canonPromise: Promise<Canon> | null = null;
export function loadCanon(): Promise<Canon> {
  canonPromise ??= fetch(`${base}/books.json`)
    .then((r) => r.json())
    .then(buildCanon);
  return canonPromise;
}

/** Builds the canon and its lookups from books.json. */
export function buildCanon({ total, books }: { total: number; books: Book[] }): Canon {
  const chapterStarts: number[] = [];
  const verseBook = new Uint8Array(total);
  const verseChapter = new Uint16Array(total);
  books.forEach((b, bi) => {
    b.firstChapter = chapterStarts.length;
    let i = b.start;
    for (const n of b.chapters) {
      verseChapter.fill(chapterStarts.length, i, i + n);
      chapterStarts.push(i);
      i += n;
    }
    b.verses = i - b.start;
    verseBook.fill(bi, b.start, i);
  });
  return { total, books, chapterStarts, verseBook, verseChapter };
}

let arcsPromise: Promise<Int16Array> | null = null;
export function loadArcs(): Promise<Int16Array> {
  arcsPromise ??= fetch(`${base}/arcs.bin`)
    .then((r) => r.arrayBuffer())
    .then((b) => new Int16Array(b));
  return arcsPromise;
}

const textCache = new Map<string, Promise<string[][]>>();
export function loadBookText(translation: TranslationId, book: number): Promise<string[][]> {
  const key = `${translation}/${book}`;
  if (!textCache.has(key)) {
    textCache.set(
      key,
      fetch(`${base}/text/${translation}/${book}.json`).then((r) => {
        if (!r.ok) throw new Error(`Missing text ${key}`);
        return r.json();
      }),
    );
  }
  return textCache.get(key)!;
}

const xrefCache = new Map<number, Promise<Record<string, XRef[]>>>();
export function loadXrefs(book: number): Promise<Record<string, XRef[]>> {
  if (!xrefCache.has(book)) {
    xrefCache.set(book, fetch(`${base}/xref/${book}.json`).then((r) => r.json()));
  }
  return xrefCache.get(book)!;
}

export function toIndex(canon: Canon, r: VerseRef): number {
  return canon.chapterStarts[canon.books[r.book].firstChapter + r.chapter - 1] + r.verse - 1;
}

export function fromIndex(canon: Canon, idx: number): VerseRef {
  const book = canon.verseBook[idx];
  const ch = canon.verseChapter[idx];
  return { book, chapter: ch - canon.books[book].firstChapter + 1, verse: idx - canon.chapterStarts[ch] + 1 };
}

/** A verse as a URL-safe id, e.g. "John.3.14". */
export function refId(canon: Canon, idx: number): string {
  const r = fromIndex(canon, idx);
  return `${canon.books[r.book].osis}.${r.chapter}.${r.verse}`;
}

/** Parses "John.3.14" (verse optional) into a global verse index, or null. */
export function parseRefId(canon: Canon, id: string): number | null {
  const [osis, c, v] = id.split(".");
  const book = canon.books.findIndex((b) => b.osis === osis);
  if (book < 0 || !(+c >= 1 && +c <= canon.books[book].chapters.length)) return null;
  return toIndex(canon, clampRef(canon, book, +c, +v));
}

/** Clamps a possibly out-of-range chapter/verse into a real reference. */
export function clampRef(canon: Canon, book: number, chapter: number, verse = 1): VerseRef {
  const b = canon.books[book];
  const c = Math.min(Math.max(1, chapter || 1), b.chapters.length);
  return { book, chapter: c, verse: Math.min(Math.max(1, verse || 1), b.chapters[c - 1]) };
}

function formatRef(canon: Canon, r: VerseRef, short = false): string {
  const b = canon.books[r.book];
  return `${short ? b.short : b.name} ${r.chapter}:${r.verse}`;
}

export function formatRange(canon: Canon, a: number, b: number, short = false): string {
  const ra = fromIndex(canon, a);
  if (a === b) return formatRef(canon, ra, short);
  const rb = fromIndex(canon, b);
  if (ra.book === rb.book && ra.chapter === rb.chapter) return `${formatRef(canon, ra, short)}-${rb.verse}`;
  return `${formatRef(canon, ra, short)} to ${formatRef(canon, rb, short)}`;
}

/** A passage: global verse range plus its parts for display. */
export type Passage = { ref: VerseRef; from: number; to: number; label: string };

const RE = /^(\w+) (\d+):(\d+)(?:-(\d+))?$/;
/** Parses curated references like "1Cor 10:1-2" (OSIS book codes). */
export function parsePassage(canon: Canon, s: string): Passage {
  const m = RE.exec(s);
  if (!m) throw new Error(`Bad reference ${s}`);
  const book = canon.books.findIndex((b) => b.osis === m[1]);
  if (book < 0) throw new Error(`Bad book ${s}`);
  const ref = { book, chapter: +m[2], verse: +m[3] };
  const from = toIndex(canon, ref);
  const to = from + (m[4] ? +m[4] - +m[3] : 0);
  return { ref, from, to, label: formatRange(canon, from, to) };
}

/** Parses free text like "john 3:16", "1 cor 13", "Gen 1". */
export function parseQuery(canon: Canon, q: string): VerseRef | null {
  const m = /^\s*([1-3]?\s*[a-z][a-z .]*?)\s*(\d+)(?:\s*[:.]\s*(\d+))?\s*$/i.exec(q);
  if (!m) return null;
  const norm = (s: string) => s.replace(/[\s.]/g, "").toLowerCase();
  const want = norm(m[1]);
  const exact = canon.books.findIndex(
    (b) => norm(b.name) === want || norm(b.short) === want || b.osis.toLowerCase() === want,
  );
  const book = exact >= 0 ? exact : canon.books.findIndex((b) => norm(b.name).startsWith(want));
  if (book < 0) return null;
  return clampRef(canon, book, +m[2], m[3] ? +m[3] : 1);
}
