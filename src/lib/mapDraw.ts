// Drawing for the whole-Bible arc map, shared by the live map (ArcCanvas)
// and the downloadable poster. Everything here works in layout units; the
// caller scales the context for the device or print resolution.
import type { ArcLayout } from "./arcGL";
import { type Canon, SECTIONS } from "./bible";
import type { Colors } from "./palette";
import { type Entry, type ThemeId, type TypeArc, THEMES } from "./typology";

// Rows under the chapter bars: book names, then section brackets.
const BOOK_ROW_DY = 14; // below the tallest bar
const SECTION_ROW_DY = 22; // below the book names
const SECTION_TEXT_PX = 13;
const TESTAMENT_ROW_DY = 22; // below the section names (wide screens only)
const TESTAMENT_TEXT_PX = 15;
/** Height of the label rows under the bars; narrow screens skip the testament row. */
const labelRowsHeight = (wide: boolean) =>
  BOOK_ROW_DY + SECTION_ROW_DY + (wide ? TESTAMENT_ROW_DY + TESTAMENT_TEXT_PX : SECTION_TEXT_PX) + 10;
const BOOK_FONT = "500 11px";
export const HOVER_FONT = "600 11px";
/** Books too narrow to name get a short tick in the name row instead. */
const TICK_H = 5;
const TICK_DY = 2; // below the top of the name row
/** Space kept between neighboring book names. */
const LABEL_PAD = 3;
/** A book name may be up to this times its book's width (lets REV show). */
const LABEL_SPILL = 1.6;
/** Section names may overhang their bracket by this much. */
const SECTION_OVERHANG = 10;
/** Below this width: no testament row, and short-form layout. */
const WIDE_MIN = 640;

type MapLayout = ArcLayout & { barMax: number };

export function computeLayout(width: number, height: number, inset?: number, compact = false): MapLayout {
  const padL = compact ? 10 : Math.max(20, width * 0.03);
  const span = width - padL * 2;
  const barMax = compact ? 8 : Math.max(26, Math.min(64, height * 0.075));
  // Room under the chapter bars for book names and section brackets.
  const below = compact ? 4 : Math.max(labelRowsHeight(width >= WIDE_MIN) + (width < WIDE_MIN ? 12 : 28), height * 0.1);
  const top = inset ?? (width < WIDE_MIN ? 118 : Math.max(110, height * 0.14));
  let baseY = height - barMax - below;
  // With room to spare (tall phone screens), center the half-circle.
  const spare = baseY - top - span / 2;
  if (spare > 0) baseY -= spare / 2;
  const hs = Math.min(1, (baseY - top) / (span / 2));
  return { width, height, padL, span, baseY, hs, barMax };
}

export type MapGeometry = ReturnType<typeof mapGeometry>;

/** Positions on the map for one canon and layout. */
export function mapGeometry(canon: Canon, L: ArcLayout) {
  /** x of a global verse index. */
  const xOf = (idx: number) => L.padL + ((idx + 0.5) / canon.total) * L.span;
  return {
    xOf,
    /** Left and right x of a run of books (inclusive). */
    bookSpan: (first: number, last = first) =>
      [xOf(canon.books[first].start), xOf(canon.books[last].start + canon.books[last].verses - 1)] as const,
    /** Adds one arc between two verses as its own subpath (stroke many at once). */
    trace(ctx: CanvasRenderingContext2D, a: number, b: number) {
      const x1 = xOf(Math.min(a, b));
      const x2 = xOf(Math.max(a, b));
      const r = Math.max(0.5, (x2 - x1) / 2);
      ctx.moveTo(x1, L.baseY);
      ctx.ellipse((x1 + x2) / 2, L.baseY, r, r * L.hs, 0, Math.PI, 2 * Math.PI);
    },
  };
}

let measurer: CanvasRenderingContext2D | null = null;
/** A scratch context for measuring text. */
function measure() {
  measurer ??= document.createElement("canvas").getContext("2d")!;
  return measurer;
}

/** Theme color of a curated entry, adjusted for the theme. */
export const typeInk = (C: Colors, e: Entry) => C.ink(THEMES[e.theme].color);
/** Opacity of type arcs that aren't the focus. */
export const DIM_ALPHA = 0.12;

export type MapLabels = ReturnType<typeof computeLabels>;

/**
 * Book names where they fit, ticks for books too narrow to name, and section
 * brackets. With `measured` false (fonts not ready, compact strip) it returns
 * only the row positions.
 */
export function computeLabels(canon: Canon, layout: MapLayout, C: Colors, measured = true) {
  const y = layout.baseY + layout.barMax + BOOK_ROW_DY;
  const sectionY = y + SECTION_ROW_DY;
  const testamentY = sectionY + TESTAMENT_ROW_DY;
  const base = { y, sectionY, testamentY, bottom: sectionY + SECTION_TEXT_PX + 6 };
  if (!measured || typeof document === "undefined") return { ...base, books: [], sections: [] };
  const ctx = measure();
  const { bookSpan } = mapGeometry(canon, layout);

  ctx.font = `${BOOK_FONT} ${C.serif}`;
  let lastRight = -Infinity;
  const named: { x: number; w: number }[] = [];
  const fits = canon.books.map((b, i) => {
    const [x1, x2] = bookSpan(i);
    const x = (x1 + x2) / 2;
    const name = b.short.toUpperCase();
    const w = ctx.measureText(name).width;
    const shown = w <= (x2 - x1) * LABEL_SPILL && x - w / 2 - LABEL_PAD >= lastRight;
    if (shown) {
      lastRight = x + w / 2 + LABEL_PAD;
      named.push({ x, w });
    }
    return { x, name, shown };
  });
  // Each book is named, ticked (too narrow, and clear of any name), or left
  // blank. Its hover name sits at hoverX, kept inside the chart.
  ctx.font = `${HOVER_FONT} ${C.serif}`;
  const books = fits.map(({ x, name, shown }) => {
    const half = ctx.measureText(name).width / 2;
    const clear = named.every((n) => Math.abs(x - n.x) > n.w / 2 + LABEL_PAD);
    const mark: "name" | "tick" | null = shown ? "name" : clear ? "tick" : null;
    const hoverX = Math.min(Math.max(x, layout.padL + half), layout.padL + layout.span - half);
    return { x, name, mark, hoverX };
  });
  ctx.font = `italic ${SECTION_TEXT_PX}px ${C.display}`;
  const index = (osis: string) => canon.books.findIndex((b) => b.osis === osis);
  const sections = SECTIONS.flatMap((s) => {
    const [l, r] = bookSpan(index(s.from), index(s.to));
    const [x1, x2] = [l + 2, r - 2];
    // An unnamed bracket reads as noise, so skip it when no name fits.
    const name = [s.name, s.short].find((n) => n && ctx.measureText(n).width <= x2 - x1 + SECTION_OVERHANG);
    return name ? [{ x1, x2, name }] : [];
  });
  return { ...base, books, sections };
}

/** Chapter bars, baseline, book labels, section brackets and the testament divider. */
export function drawBase(ctx: CanvasRenderingContext2D, canon: Canon, layout: MapLayout, labels: MapLabels, C: Colors, compact = false) {
  const { baseY, barMax } = layout;
  const { xOf } = mapGeometry(canon, layout);
  const pxPerVerse = layout.span / canon.total;
  let ch = 0;
  canon.books.forEach((b, bi) => {
    const tone = bi % 2 ? 0.5 : 0.28;
    b.chapters.forEach((n) => {
      const x = xOf(canon.chapterStarts[ch]) - pxPerVerse / 2;
      const w = n * pxPerVerse;
      const h = Math.max(2, (n / 176) * barMax);
      ctx.fillStyle = `rgba(${C.fg}, ${tone})`;
      ctx.fillRect(x, baseY + 3, Math.max(0.6, w - (w > 2.5 ? 0.6 : 0)), h);
      ch++;
    });
  });
  ctx.fillStyle = `rgba(${C.fg}, 0.35)`;
  ctx.fillRect(layout.padL, baseY, layout.span, 1);
  if (compact) return;

  ctx.font = `${BOOK_FONT} ${C.serif}`;
  ctx.fillStyle = C.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const L of labels.books) {
    if (L.mark === "name") ctx.fillText(L.name, L.x, labels.y);
    else if (L.mark === "tick") ctx.fillRect(Math.round(L.x), labels.y + TICK_DY, 1, TICK_H);
  }
  ctx.font = `italic ${SECTION_TEXT_PX}px ${C.display}`;
  ctx.strokeStyle = C.text;
  ctx.lineWidth = 0.75;
  for (const { x1, x2, name } of labels.sections) {
    const y = labels.sectionY;
    ctx.beginPath();
    ctx.moveTo(x1, y - 4);
    ctx.lineTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.lineTo(x2, y - 4);
    ctx.stroke();
    ctx.fillText(name, (x1 + x2) / 2, y + 4);
  }
  const ntX = xOf(canon.books[39].start) - pxPerVerse / 2;
  ctx.fillStyle = C.text;
  if (layout.width < WIDE_MIN) {
    ctx.fillRect(ntX, baseY - 6, 1, barMax + 12);
    return;
  }
  // The divider runs down to a row below the sections, labeled either side.
  ctx.fillRect(ntX, baseY - 6, 1, labels.testamentY - baseY + 6 + TESTAMENT_TEXT_PX);
  ctx.font = `italic ${TESTAMENT_TEXT_PX}px ${C.display}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "right";
  ctx.fillText("← Old Testament", ntX - 10, labels.testamentY);
  ctx.textAlign = "left";
  ctx.fillText("New Testament →", ntX + 10, labels.testamentY);
}

/** The curated type arcs in their theme colors; others dim when one is `hot`. */
export function drawTypeArcs(
  ctx: CanvasRenderingContext2D,
  canon: Canon,
  layout: ArcLayout,
  typeArcs: TypeArc[],
  entries: Entry[],
  C: Colors,
  { themeFilter = null, hot = null, weight = 1 }: { themeFilter?: ThemeId | null; hot?: number | null; weight?: number } = {},
) {
  const { trace } = mapGeometry(canon, layout);
  ctx.shadowBlur = 0;
  for (const t of typeArcs) {
    const e = entries[t.entry];
    const dim = (themeFilter && e.theme !== themeFilter) || (hot !== null && hot !== t.entry);
    ctx.strokeStyle = typeInk(C, e);
    ctx.globalAlpha = dim ? DIM_ALPHA : t.primary ? 0.95 : 0.5;
    ctx.lineWidth = (t.primary ? 1.4 : 0.9) * weight;
    ctx.beginPath();
    trace(ctx, t.a, t.b);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Field brightness: types mode keeps the rainbow faint behind the colored arcs. */
export function fieldAlpha(mode: "all" | "types", C: Colors, width: number, quiet = false) {
  return (
    (mode === "types" ? (C.light ? 0.0035 : 0.006) : quiet ? 0.01 : 0.022) *
    // Narrow screens pack the same arcs into far fewer pixels.
    Math.min(1, Math.max(0.15, Math.pow(width / 1000, 1.5)))
  );
}
