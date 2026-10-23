"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mode } from "@/lib/arcs";
import { type Canon, type XRef, formatRange, fromIndex, loadXrefs, toIndex } from "@/lib/bible";
import { dot, haloText, prep, strokeLink } from "@/lib/canvas";
import { type Theme, colorsFor } from "@/lib/palette";
import { type Entry, type ThemeId, THEMES, entryTip } from "@/lib/typology";
import { useElementSize } from "@/lib/useElementSize";
import { ZoomTrail } from "./Controls";
import MapTip from "./MapTip";

// Level 2: one book's chapters on the left, flowing into every book of the
// Bible on the right. Line thickness = number of cross-references.

type Props = {
  canon: Canon;
  book: number;
  minVotes: number;
  mode: Mode;
  entries: Entry[];
  themeFilter: ThemeId | null;
  focusVerse: number | null;
  focusXrefs: XRef[] | null;
  link: { from: number; to: number } | null;
  /** Chapter open in the reader (0-based), kept lit after a click. */
  activeChapter: number | null;
  onOpenChapter: (idx: number) => void;
  onOpenVerse: (idx: number) => void;
  onPickBook: (book: number) => void;
  onPickEntry: (i: number) => void;
  onBack: () => void;
  /** Space reserved at the top for overlaid controls. */
  top?: number;
  theme: Theme;
  /** Recompute colors when the palette changes. */
  palette?: string;
};

type Flow = { chapter: number; target: number; count: number; firstVerse: number };
type TypeLink = { entry: number; chapter: number; to: number };
type Hover =
  | { kind: "chapter"; chapter: number }
  | { kind: "book"; book: number }
  | { kind: "flow"; flow: number }
  | { kind: "entry"; entry: number }
  | null;

const hoverKey = (h: Hover) =>
  !h ? "" : h.kind === "chapter" ? `c${h.chapter}` : h.kind === "book" ? `b${h.book}` : h.kind === "flow" ? `f${h.flow}` : `e${h.entry}`;

export default function BookView(p: Props) {
  const { canon, book, minVotes, mode, entries, themeFilter, focusVerse, focusXrefs, link, activeChapter } = p;
  const b = canon.books[book];
  const C = useMemo(() => colorsFor(p.theme), [p.theme, p.palette]);
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(wrap);
  const [xrefs, setXrefs] = useState<Record<string, XRef[]> | null>(null);
  // Position is tracked apart from the target so moving within one target
  // doesn't redraw the chart.
  const [hover, setHoverState] = useState<Hover>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const setHover = (h: Hover) => setHoverState((prev) => (hoverKey(prev) === hoverKey(h) ? prev : h));
  const pending = useRef(0);

  useEffect(() => {
    let live = true;
    setXrefs(null);
    loadXrefs(book).then((x) => live && setXrefs(x));
    return () => {
      live = false;
    };
  }, [book]);

  const verseBook = canon.verseBook;

  // Aggregate chapter → book flows, with each flow's color precomputed.
  const data = useMemo(() => {
    const nCh = b.chapters.length;
    const perChapter = new Array(nCh).fill(0);
    const perBook = new Array(66).fill(0);
    const map = new Map<number, Flow>();
    if (xrefs) {
      for (const key in xrefs) {
        const [c, v] = key.split(".").map(Number);
        for (const [to, , votes] of xrefs[key]) {
          if (votes < minVotes) continue;
          const tb = verseBook[to];
          const k = (c - 1) * 66 + tb;
          const f = map.get(k);
          if (f) f.count++;
          else map.set(k, { chapter: c - 1, target: tb, count: 1, firstVerse: toIndex(canon, { book, chapter: c, verse: v }) });
          perChapter[c - 1]++;
          perBook[tb]++;
        }
      }
    }
    const flows = [...map.values()].sort((x, y) => x.target - y.target || x.chapter - y.chapter);
    const total = flows.reduce((s, f) => s + f.count, 0);
    // Rainbow position: how far the flow reaches, from its first verse to the target's middle.
    const reach = flows.map((f) => {
      const tb = canon.books[f.target];
      return Math.sqrt(Math.abs(tb.start + tb.verses / 2 - f.firstVerse) / canon.total);
    });
    return { flows, reach, perChapter, perBook, total, maxChapter: Math.max(1, ...perChapter) };
  }, [xrefs, minVotes, verseBook, b, book, canon]);

  // Curated types that touch this book.
  const typeLinks = useMemo(() => {
    const out: TypeLink[] = [];
    entries.forEach((e, i) => {
      const sides = [e.shadow, e.substance];
      sides.forEach((side, s) => {
        for (const here of side) {
          if (here.ref.book !== book) continue;
          for (const there of sides[1 - s]) out.push({ entry: i, chapter: here.ref.chapter - 1, to: there.from });
        }
      });
    });
    return out;
  }, [entries, book]);

  // ---- layout -------------------------------------------------------------
  const L = useMemo(() => {
    const { w, h } = size;
    const narrow = w < 640;
    // Leave room for the header (taller when the votes slider shows).
    const top = p.top ?? (narrow ? 150 : mode === "all" ? 304 : 276);
    const bottom = narrow ? 24 : 48;
    const x0 = narrow ? 64 : Math.max(170, w * 0.2);
    const x1 = w - (narrow ? 70 : Math.max(170, w * 0.2));
    const nCh = b.chapters.length;
    const rowH = (h - top - bottom) / nCh;
    const rowY = (c: number) => top + (c + 0.5) * rowH;

    const gap = narrow ? 1 : 2;
    const testamentGap = 14;
    const minH = 1.5;
    const avail = h - top - bottom - 65 * gap - testamentGap - 66 * minH;
    const scale = data.total ? Math.max(0, avail) / data.total : 0;
    const blocks: { y: number; h: number }[] = [];
    let y = top;
    for (let i = 0; i < 66; i++) {
      if (i === 39) y += testamentGap;
      const bh = minH + data.perBook[i] * scale;
      blocks.push({ y, h: bh });
      y += bh + gap;
    }
    // Stack each flow's slot inside its target block, in chapter order.
    const cursor = blocks.map((bl) => bl.y + minH / 2);
    const slots = data.flows.map((f) => {
      const hh = f.count * scale;
      const s = { y: cursor[f.target] + hh / 2, h: hh };
      cursor[f.target] += hh;
      return s;
    });
    // Where a specific verse lands inside its book's block.
    const verseY = (idx: number) => {
      const r = fromIndex(canon, idx);
      const bl = blocks[r.book];
      const n = canon.books[r.book].chapters.length;
      return bl.y + ((r.chapter - 0.5) / n) * bl.h;
    };
    const typeY = typeLinks.map((t) => [rowY(t.chapter), verseY(t.to)] as const);
    return { top, bottom, x0, x1, rowH, rowY, blocks, slots, verseY, typeY, narrow };
  }, [size, b, data, canon, mode, p.top, typeLinks]);

  const curve = (ctx: CanvasRenderingContext2D, y0: number, y1: number) => {
    const mx = (L.x0 + L.x1) / 2;
    ctx.beginPath();
    ctx.moveTo(L.x0, y0);
    ctx.bezierCurveTo(mx, y0, mx, y1, L.x1, y1);
    ctx.stroke();
  };

  // ---- draw ---------------------------------------------------------------
  useEffect(() => {
    const c = cv.current;
    if (!c || !size.w) return;
    const ctx = prep(c, size.w, size.h);
    ctx.lineCap = "round";
    const { serif, display } = C;

    const hc =
      hover?.kind === "chapter"
        ? hover.chapter
        : focusVerse !== null && verseBook[focusVerse] === book
          ? fromIndex(canon, focusVerse).chapter - 1
          : activeChapter;
    const hb = hover?.kind === "book" ? hover.book : null;
    const hf = hover?.kind === "flow" ? hover.flow : null;
    const anyHot = hc !== null || hb !== null || hf !== null || link !== null;
    const quiet = mode === "types";

    // Flows: quiet ones first, the lit ones drawn on top.
    const isHot = (f: Flow, i: number) => hf === i || hc === f.chapter || hb === f.target;
    const hotTargets = new Set<number>();
    for (const pass of [false, true]) {
      data.flows.forEach((f, i) => {
        const hot = isHot(f, i);
        if (hot !== pass) return;
        if (hot) hotTargets.add(f.target);
        ctx.strokeStyle = C.span(data.reach[i], hot ? 0.95 : anyHot ? 0.04 : quiet ? 0.07 : 0.32);
        ctx.lineWidth = hot ? Math.max(1.4, L.slots[i].h) : Math.max(0.6, L.slots[i].h);
        curve(ctx, L.rowY(f.chapter), L.slots[i].y);
      });
    }

    // Focused verse: its own connections, landing where they point.
    if (focusVerse !== null && focusXrefs && verseBook[focusVerse] === book && !link) {
      const y0 = L.rowY(fromIndex(canon, focusVerse).chapter - 1);
      ctx.strokeStyle = `rgba(${C.fg}, 0.7)`;
      ctx.lineWidth = 1;
      for (const [to, , votes] of focusXrefs) if (votes >= minVotes) curve(ctx, y0, L.verseY(to));
    }

    // Curated types
    const hotEntry = hover?.kind === "entry" ? hover.entry : null;
    typeLinks.forEach((t, k) => {
      const e = entries[t.entry];
      if (themeFilter && e.theme !== themeFilter) return;
      const hot = hotEntry === t.entry || hc === t.chapter;
      const dim = !hot && (hotEntry !== null || anyHot);
      ctx.strokeStyle = C.ink(THEMES[e.theme].color);
      ctx.globalAlpha = dim ? 0.12 : quiet || hot ? 1 : 0.8;
      ctx.lineWidth = hot ? 3 : 2;
      ctx.shadowColor = C.ink(THEMES[e.theme].color);
      ctx.shadowBlur = C.glow(hot ? 14 : quiet && !dim ? 6 : 0);
      const [y0, y1] = L.typeY[k];
      curve(ctx, y0, y1);
      dot(ctx, L.x1, y1, C.ink(THEMES[e.theme].color));
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // The selected connection.
    if (link) {
      const [here, there] = verseBook[link.from] === book ? [link.from, link.to] : [link.to, link.from];
      if (verseBook[here] === book) {
        const y0 = L.rowY(fromIndex(canon, here).chapter - 1);
        const y1 = L.verseY(there);
        strokeLink(ctx, C, () => curve(ctx, y0, y1));
        dot(ctx, L.x0, y0, C.link, 3.5);
        dot(ctx, L.x1, y1, C.link, 3.5);
        ctx.font = `600 13px ${serif}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        haloText(ctx, formatRange(canon, there, there, true), L.x1 - 10, y1 - 12, C.link, C);
      }
    }

    // Left column: chapters
    const step = L.rowH >= 12 ? 1 : L.rowH >= 6 ? 5 : 10;
    ctx.textBaseline = "middle";
    for (let c = 0; c < b.chapters.length; c++) {
      const y = L.rowY(c);
      const hot = hc === c;
      const w = (data.perChapter[c] / data.maxChapter) * (L.narrow ? 26 : 70);
      ctx.fillStyle = hot ? C.link : `rgba(${C.fg}, ${anyHot ? 0.25 : 0.45})`;
      ctx.fillRect(L.x0 - w - 4, y - Math.max(0.5, Math.min(L.rowH * 0.35, 4)), w, Math.max(1, Math.min(L.rowH * 0.7, 8)));
      if (hot || (c + 1) % step === 0 || c === 0) {
        ctx.font = `${hot ? 600 : 400} ${hot ? 13 : 11}px ${serif}`;
        ctx.fillStyle = hot ? C.link : C.text;
        ctx.textAlign = "right";
        ctx.fillText(String(c + 1), L.x0 - (L.narrow ? 34 : 82), y);
      }
    }

    // Right column: books
    ctx.textAlign = "left";
    let lastLabel = -Infinity; // skip labels that would collide
    canon.books.forEach((bk, i) => {
      const bl = L.blocks[i];
      const hot = hb === i || hotTargets.has(i);
      const self = i === book;
      ctx.fillStyle = hot ? C.link : self ? `rgba(${C.fg}, 0.85)` : `rgba(${C.fg}, ${data.perBook[i] ? 0.5 : 0.15})`;
      ctx.fillRect(L.x1 + 2, bl.y, 4, Math.max(1, bl.h - 0.5));
      const ly = bl.y + bl.h / 2;
      if ((bl.h >= 11 || hot) && ly - lastLabel >= 13) {
        lastLabel = ly;
        ctx.font = `${hot || self ? 600 : 400} ${bl.h >= 18 ? 13 : 11}px ${serif}`;
        ctx.fillStyle = hot ? C.link : self ? `rgba(${C.fg}, 0.9)` : C.text;
        ctx.fillText(L.narrow ? bk.short : bk.name, L.x1 + 12, ly);
      }
    });

    // Column captions
    ctx.font = `italic 15px ${display}`;
    ctx.fillStyle = C.text;
    ctx.textAlign = L.narrow ? "right" : "left";
    ctx.fillText("Where it connects", L.narrow ? size.w - 8 : L.x1 + 2, L.top - 22);
  }, [size, L, data, hover, mode, typeLinks, entries, themeFilter, focusVerse, focusXrefs, link, b, book, canon, verseBook, minVotes, activeChapter, C]);

  // ---- interaction --------------------------------------------------------
  function hitTest(x: number, y: number): Hover {
    if (y < L.top - 8 || y > size.h - L.bottom + 8) return null;
    if (x < L.x0 + 6) {
      const c = Math.floor((y - L.top) / L.rowH);
      return c >= 0 && c < b.chapters.length ? { kind: "chapter", chapter: c } : null;
    }
    if (x > L.x1 - 4) {
      const i = L.blocks.findIndex((bl) => y >= bl.y - 1 && y <= bl.y + bl.h + 1);
      return i >= 0 ? { kind: "book", book: i } : null;
    }
    // Types first, then flows: sample each curve at this x. Every curve shares
    // the same x control points, so the curve parameter is solved once.
    if (x <= L.x0 || x >= L.x1) return null;
    const mx = (L.x0 + L.x1) / 2;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 14; k++) {
      const s = (lo + hi) / 2;
      if (bez(L.x0, mx, mx, L.x1, s) < x) lo = s;
      else hi = s;
    }
    const s = (lo + hi) / 2;
    const at = (y0: number, y1: number) => bez(y0, y0, y1, y1, s);
    for (let k = 0; k < typeLinks.length; k++) {
      const tl = typeLinks[k];
      if (themeFilter && entries[tl.entry].theme !== themeFilter) continue;
      if (Math.abs(at(...L.typeY[k]) - y) < 5) return { kind: "entry", entry: tl.entry };
    }
    let best = -1;
    let bestD = 4;
    data.flows.forEach((f, i) => {
      const d = Math.abs(at(L.rowY(f.chapter), L.slots[i].y) - y) - L.slots[i].h / 2;
      if (d < bestD) [best, bestD] = [i, d];
    });
    return best >= 0 ? { kind: "flow", flow: best } : null;
  }

  // Hit-test at the click point itself so taps work without a prior hover.
  function onClick(ev: React.MouseEvent) {
    const rect = wrap.current!.getBoundingClientRect();
    const hover = hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
    if (!hover) return;
    if (hover.kind === "chapter") p.onOpenChapter(toIndex(canon, { book, chapter: hover.chapter + 1, verse: 1 }));
    else if (hover.kind === "book") p.onPickBook(hover.book);
    else if (hover.kind === "flow") p.onOpenVerse(data.flows[hover.flow].firstVerse);
    else p.onPickEntry(hover.entry);
  }

  const tip = (() => {
    if (!hover) return null;
    if (hover.kind === "chapter") {
      const n = data.perChapter[hover.chapter];
      return { title: `${b.name} ${hover.chapter + 1}`, sub: `${n.toLocaleString()} connections · click to read` };
    }
    if (hover.kind === "book") {
      const n = data.perBook[hover.book];
      return {
        title: canon.books[hover.book].name,
        sub: hover.book === book ? `${n} links within ${b.name}` : `${n} from ${b.name} · click to explore`,
      };
    }
    if (hover.kind === "flow") {
      const f = data.flows[hover.flow];
      return { title: `${b.name} ${f.chapter + 1} → ${canon.books[f.target].name}`, sub: `${f.count} connections · click to read` };
    }
    return entryTip(entries[hover.entry]);
  })();

  return (
    <div
      ref={wrap}
      className="absolute inset-0 select-none"
      style={{ cursor: hover ? "pointer" : "default" }}
      onPointerMove={(ev) => {
        const r = wrap.current!.getBoundingClientRect();
        const x = ev.clientX - r.left;
        const y = ev.clientY - r.top;
        cancelAnimationFrame(pending.current);
        pending.current = requestAnimationFrame(() => {
          setHover(hitTest(x, y));
          setPos({ x, y });
        });
      }}
      onPointerLeave={() => setHover(null)}
      onClick={onClick}
    >
      <canvas ref={cv} className="absolute inset-0 h-full w-full" />
      {/* Zoom trail, centered over the chart (desktop; mobile shows it in the header). */}
      <div
        className="absolute hidden -translate-x-1/2 md:block"
        style={{ left: (L.x0 + L.x1) / 2, top: L.top - 92 }}
        onPointerMove={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <ZoomTrail name={b.name} onBack={p.onBack} size="lg" />
      </div>
      {!xrefs && (
        <p className="absolute inset-x-0 top-1/2 text-center font-display text-lg italic text-muted">Tracing {b.name}…</p>
      )}
      {tip && <MapTip x={Math.min(Math.max(pos.x, 130), size.w - 130)} y={Math.max(8, pos.y - 72)} {...tip} />}
    </div>
  );
}

function bez(a: number, b: number, c: number, d: number, t: number) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}
