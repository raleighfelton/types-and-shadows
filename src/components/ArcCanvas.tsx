"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ArcLayout, ArcGL } from "@/lib/arcGL";
import { type Mode, filterArcs } from "@/lib/arcs";
import { type Canon, type XRef, formatRange, fromIndex } from "@/lib/bible";
import { dot, haloText, prep, strokeLink } from "@/lib/canvas";
import {
  HOVER_FONT,
  computeLabels,
  computeLayout,
  drawBase,
  drawTypeArcs,
  fieldAlpha,
  mapGeometry,
  typeInk,
} from "@/lib/mapDraw";
import { type Theme, colorsFor } from "@/lib/palette";
import type { PaletteId } from "@/lib/settingsConfig";
import { type Entry, type ThemeId, type TypeArc, entryTip } from "@/lib/typology";
import { useElementSize } from "@/lib/useElementSize";
import MapTip from "./MapTip";

type Props = {
  canon: Canon;
  arcs: Int16Array;
  minVotes: number;
  mode: Mode;
  entries: Entry[];
  typeArcs: TypeArc[];
  themeFilter: ThemeId | null;
  focusVerse: number | null;
  focusXrefs: XRef[] | null;
  focusEntry: number | null;
  link: { from: number; to: number } | null;
  onPickVerse: (idx: number) => void;
  onPickEntry: (i: number) => void;
  onPickBook: (book: number) => void;
  /** Space reserved at the top for overlaid controls. */
  top?: number;
  /** Mini strip: no labels, no interaction, no intro animation. */
  compact?: boolean;
  theme: Theme;
  palette: PaletteId;
};

// What the pointer is over. Position is tracked separately so moving within
// the same target doesn't redraw the overlay.
type Hover =
  | { kind: "chapter"; chapter: number; verse: number }
  | { kind: "arc"; a: number; b: number }
  | { kind: "entry"; entry: number }
  | { kind: "book"; book: number }
  | null;

const hoverKey = (h: Hover) =>
  !h ? "" : h.kind === "chapter" ? `c${h.chapter}` : h.kind === "arc" ? `a${h.a}-${h.b}` : h.kind === "entry" ? `e${h.entry}` : `b${h.book}`;

const REVEAL_MS = 2600;

export default function ArcCanvas(props: Props) {
  const { canon, arcs, minVotes, mode, entries, typeArcs, themeFilter, focusVerse, focusXrefs, focusEntry, link } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ArcGL | null>(null);
  const compact = props.compact ?? false;
  const C = useMemo(() => colorsFor(props.theme, props.palette), [props.theme, props.palette]);
  const revealed = useRef(compact ? 1 : 0);
  const size = useElementSize(wrapRef);
  const [hover, setHoverState] = useState<Hover>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const setHover = (h: Hover) => setHoverState((prev) => (hoverKey(prev) === hoverKey(h) ? prev : h));
  const [glError, setGlError] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);
  const layout = useMemo(() => computeLayout(size.w, size.h, props.top, compact), [size, props.top, compact]);
  const total = canon.total;
  const geo = useMemo(() => mapGeometry(canon, layout), [canon, layout]);
  const { xOf, bookSpan } = geo;

  // Book names where they fit; under them, brackets naming each section of
  // the canon so the crowded short books still read in context. Measured once
  // per layout and font, then shared by drawing, hover and hit-testing.
  const labels = useMemo(
    // Measured once the web fonts load (names are re-measured then).
    () => computeLabels(canon, layout, C, fontsReady && !compact && size.w > 0),
    [canon, layout, C, fontsReady, compact, size.w],
  );


  const verseChapter = canon.verseChapter;
  const filtered = useMemo(() => filterArcs(canon, arcs, minVotes), [canon, arcs, minVotes]);

  // GL setup
  useEffect(() => {
    try {
      renderer.current = new ArcGL(glRef.current!);
    } catch {
      setGlError(true);
    }
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  const alpha = fieldAlpha(mode, C, size.w, focusVerse !== null || hover?.kind === "chapter") * (compact ? 0.6 : 1);

  useEffect(() => {
    renderer.current?.setArcs(filtered.gpu);
  }, [filtered]);

  // Draw the field (with a one-time bloom on first load).
  useEffect(() => {
    const r = renderer.current;
    if (!r || !size.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (revealed.current >= 1) {
      r.draw(layout, dpr, alpha, C.bg, C.light);
      return;
    }
    let raf = 0;
    const t0 = performance.now() - revealed.current * REVEAL_MS;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / REVEAL_MS));
      revealed.current = p;
      const eased = 1 - Math.pow(1 - p, 3);
      r.draw(layout, dpr, alpha, C.bg, C.light, Math.floor(eased * r.count));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [layout, size.w, filtered, alpha, C]);

  // Base layer: chapter bars and book labels.
  useEffect(() => {
    const c = baseRef.current;
    if (!c || !size.w) return;
    drawBase(prep(c, size.w, size.h), canon, layout, labels, C, compact);
  }, [layout, canon, size, compact, C, labels]);

  // Overlay: type arcs, focus, hover.
  useEffect(() => {
    const c = overRef.current;
    if (!c || !size.w) return;
    const ctx = prep(c, size.w, size.h);
    const { baseY } = layout;
    const trace = (a: number, b: number) => geo.trace(ctx, a, b);
    const arc = (a: number, b: number) => {
      ctx.beginPath();
      trace(a, b);
      ctx.stroke();
    };

    if (mode === "types") {
      const hot = hover?.kind === "entry" ? hover.entry : focusEntry;
      drawTypeArcs(ctx, canon, layout, typeArcs, entries, C, { themeFilter, hot });
      if (hot !== null) {
        const e = entries[hot];
        ctx.strokeStyle = typeInk(C, e);
        ctx.shadowColor = typeInk(C, e);
        ctx.shadowBlur = C.glow(14);
        ctx.globalAlpha = 1;
        for (const t of typeArcs) {
          if (t.entry !== hot) continue;
          ctx.lineWidth = t.primary ? 2.6 : 1.5;
          arc(t.a, t.b);
        }
        ctx.shadowBlur = 0;
        for (const p of [...e.shadow, ...e.substance]) dot(ctx, xOf(p.from), baseY, typeInk(C, e));
      }
    }

    if (hover?.kind === "chapter" && mode === "all") {
      const { offsets, byChapter } = filtered;
      ctx.strokeStyle = `rgb(${C.fg})`;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      for (let k = offsets[hover.chapter]; k < offsets[hover.chapter + 1]; k++) {
        const i = byChapter[k];
        trace(arcs[i * 3], arcs[i * 3 + 1]);
      }
      ctx.stroke();
    }

    if (focusVerse !== null && focusXrefs) {
      ctx.strokeStyle = `rgb(${C.fg})`;
      ctx.shadowColor = `rgb(${C.fg})`;
      for (const [to, , votes] of focusXrefs) {
        if (votes < minVotes) continue;
        ctx.globalAlpha = link ? 0.18 : Math.min(1, 0.35 + Math.log10(Math.max(1, votes)) * 0.35);
        ctx.lineWidth = votes >= 20 ? 1.6 : 1;
        ctx.shadowBlur = C.glow(votes >= 20 ? 8 : 0);
        arc(focusVerse, to);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      dot(ctx, xOf(focusVerse), baseY, `rgb(${C.fg})`);
    }

    if (link) {
      strokeLink(ctx, C, () => arc(link.from, link.to));
      dot(ctx, xOf(link.from), baseY, C.link);
      dot(ctx, xOf(link.to), baseY, C.link);
      // Label sits just outside the arc's foot so the line doesn't cross it.
      const outward = link.to < link.from ? -1 : 1;
      ctx.font = `600 13px ${C.serif}`;
      ctx.textAlign = outward < 0 ? "right" : "left";
      ctx.textBaseline = "bottom";
      const text = formatRange(canon, link.to, link.to, true);
      // Flip sides if the label would run off the edge.
      const tw = ctx.measureText(text).width;
      let lx = xOf(link.to) + outward * 7;
      if (outward < 0 && lx - tw < 4) [lx, ctx.textAlign] = [xOf(link.to) + 7, "left"];
      if (outward > 0 && lx + tw > size.w - 4) [lx, ctx.textAlign] = [xOf(link.to) - 7, "right"];
      haloText(ctx, text, lx, baseY - 6, C.link, C);
    }

    if (hover?.kind === "arc") {
      ctx.strokeStyle = `rgb(${C.fg})`;
      ctx.shadowColor = `rgb(${C.fg})`;
      ctx.shadowBlur = C.glow(10);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.8;
      arc(hover.a, hover.b);
      ctx.shadowBlur = 0;
    }

    if (hover?.kind === "book") {
      const [x1, x2] = bookSpan(hover.book);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = C.link;
      ctx.fillRect(x1, baseY - 1, Math.max(2, x2 - x1), 2);
      const L = labels.books[hover.book];
      if (L) {
        // Named or not, the hovered book's name shows in its place.
        ctx.globalAlpha = 1;
        ctx.font = `${HOVER_FONT} ${C.serif}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        // A wide halo clears the neighboring ticks under the name.
        haloText(ctx, L.name, L.hoverX, labels.y, C.link, C, 8);
      }
    }

    if (hover?.kind === "chapter") {
      const start = canon.chapterStarts[hover.chapter];
      const end = canon.chapterStarts[hover.chapter + 1] ?? total;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = `rgb(${C.fg})`;
      ctx.fillRect(Math.round(xOf((start + end - 1) / 2)), baseY - 10, 1, 10);
    }
    ctx.globalAlpha = 1;
  }, [layout, size, mode, hover, typeArcs, entries, themeFilter, focusVerse, focusXrefs, focusEntry, filtered, arcs, link, canon, C, minVotes, labels]);

  // ---- interaction --------------------------------------------------------
  const pending = useRef<number>(0);
  function onMove(ev: React.PointerEvent) {
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => {
      setHover(hitTest(x, y));
      setPos({ x, y });
    });
  }

  function hitTest(x: number, y: number): Hover {
    const { baseY, padL, span, hs, barMax } = layout;
    if (x < padL || x > padL + span) return null;
    const verse = Math.max(0, Math.min(total - 1, Math.floor(((x - padL) / span) * total)));
    if (y >= baseY - 8 && y <= baseY + barMax + 8) {
      return { kind: "chapter", chapter: verseChapter[verse], verse };
    }
    if (y > baseY + barMax + 8 && y <= labels.bottom) {
      return { kind: "book", book: canon.verseBook[verse] };
    }
    if (y > baseY) return null;
    // distance to an arc ≈ |normalized radius - 1| * r
    const near = (a: number, b: number) => {
      const x1 = xOf(Math.min(a, b));
      const x2 = xOf(Math.max(a, b));
      const r = (x2 - x1) / 2;
      if (r < 1.5) return Infinity;
      const dx = (x - (x1 + x2) / 2) / r;
      const dy = (baseY - y) / (r * hs);
      return Math.abs(Math.hypot(dx, dy) - 1) * r * Math.max(hs, 0.5);
    };
    if (mode === "types") {
      let best = -1;
      let bestD = 9;
      for (const t of typeArcs) {
        if (themeFilter && entries[t.entry].theme !== themeFilter) continue;
        const d = near(t.a, t.b);
        if (d < bestD) [best, bestD] = [t.entry, d];
      }
      return best >= 0 ? { kind: "entry", entry: best } : null;
    }
    // Field arcs: favor well-attested ones when several are close. Arcs are
    // sorted short → long, so skip every arc too short to reach this height.
    const { keep } = filtered;
    const pxPerVerse = span / total;
    const minSpan = (2 * Math.max(0, (baseY - y - 3) / hs)) / pxPerVerse;
    let lo = 0;
    let hi = keep.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arcs[keep[mid] * 3 + 1] - arcs[keep[mid] * 3] < minSpan) lo = mid + 1;
      else hi = mid;
    }
    let best = -1;
    let bestScore = Infinity;
    for (let k = lo; k < keep.length; k++) {
      const i = keep[k];
      const a = arcs[i * 3];
      const b = arcs[i * 3 + 1];
      if (x < xOf(a) - 3 || x > xOf(b) + 3) continue;
      const d = near(a, b);
      if (d < 3) {
        const score = d - Math.log10(Math.max(1, arcs[i * 3 + 2]));
        if (score < bestScore) [best, bestScore] = [i, score];
      }
    }
    return best >= 0 ? { kind: "arc", a: arcs[best * 3], b: arcs[best * 3 + 1] } : null;
  }

  // Hit-test at the click point itself so taps work without a prior hover.
  function onClick(ev: React.MouseEvent) {
    const rect = wrapRef.current!.getBoundingClientRect();
    const hover = hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
    if (!hover) return;
    if (hover.kind === "chapter") props.onPickVerse(hover.verse);
    else if (hover.kind === "arc") props.onPickVerse(hover.a);
    else if (hover.kind === "book") props.onPickBook(hover.book);
    else props.onPickEntry(hover.entry);
  }

  const tip = hover && tooltip(hover);
  function tooltip(h: NonNullable<Hover>) {
    if (h.kind === "chapter") {
      const r = fromIndex(canon, h.verse);
      const n = filtered.offsets[h.chapter + 1] - filtered.offsets[h.chapter];
      return {
        title: `${canon.books[r.book].name} ${r.chapter}`,
        sub: mode === "all" ? `${n.toLocaleString()} connections · click to read` : "Click to read",
      };
    }
    if (h.kind === "book") return { title: canon.books[h.book].name, sub: "Click to see where it connects" };
    if (h.kind === "arc") return { title: `${formatRange(canon, h.a, h.a)} · ${formatRange(canon, h.b, h.b)}`, sub: "Click to read" };
    return entryTip(entries[h.entry]);
  }

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 select-none ${compact ? "pointer-events-none" : ""}`}
      style={{ cursor: hover ? "pointer" : "default" }}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      onClick={onClick}
    >
      <canvas ref={glRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={overRef} className="absolute inset-0 h-full w-full" />
      {glError && (
        <p className="absolute inset-x-0 top-1/3 text-center text-soft italic">
          This browser can&apos;t draw the full map (WebGL2 is off). The reader still works.
        </p>
      )}
      {tip && hover && (
        <MapTip
          x={Math.min(Math.max(pos.x, 120), size.w - 120)}
          y={hover.kind === "chapter" || hover.kind === "book" ? layout.baseY - 74 : pos.y - 70}
          {...tip}
        />
      )}
    </div>
  );
}
