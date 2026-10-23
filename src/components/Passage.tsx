"use client";

import { useEffect, useState } from "react";
import { type Canon, type TranslationId, fromIndex, loadBookText } from "@/lib/bible";

/** Loads verse text for a global range [from, to] in one translation. */
export function useVerses(canon: Canon, translation: TranslationId, from: number, to: number) {
  const [verses, setVerses] = useState<{ n: number; text: string }[] | null>(null);
  useEffect(() => {
    let live = true;
    // A range can run past the end of a book (e.g. Lev 27:34-Num 1:1).
    const first = fromIndex(canon, from).book;
    const last = fromIndex(canon, to).book;
    const ids = Array.from({ length: last - first + 1 }, (_, k) => first + k);
    Promise.all(ids.map((b) => loadBookText(translation, b))).then((books) => {
      if (!live) return;
      const out: { n: number; text: string }[] = [];
      for (let i = from; i <= to; i++) {
        const r = fromIndex(canon, i);
        out.push({ n: r.verse, text: books[r.book - first][r.chapter - 1][r.verse - 1] });
      }
      setVerses(out);
    });
    return () => {
      live = false;
    };
  }, [canon, translation, from, to]);
  return verses;
}

export function VerseText({ text }: { text: string }) {
  if (!text) return <span className="italic text-muted">Not in this translation&apos;s main text.</span>;
  return <>{text}</>;
}

export default function Passage({
  canon,
  translation,
  from,
  to,
  highlight,
}: {
  canon: Canon;
  translation: TranslationId;
  from: number;
  to: number;
  highlight?: [number, number];
}) {
  const verses = useVerses(canon, translation, from, to);
  if (!verses) return <p className="h-12 animate-pulse rounded-sm bg-parchment/5" />;
  return (
    <p className="scripture">
      {verses.map((v, i) => {
        const idx = from + i;
        const hot = highlight && idx >= highlight[0] && idx <= highlight[1];
        return (
          <span key={idx} className={hot ? "hot" : undefined}>
            <sup>{v.n}</sup>
            <VerseText text={v.text} />{" "}
          </span>
        );
      })}
    </p>
  );
}
