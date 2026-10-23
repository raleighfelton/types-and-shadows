// Downloadable poster of the whole map, drawn with the same code as the live
// map at print or screen resolution: title, the arcs, book labels, sections,
// a legend (types) and credits.
import { ArcGL, MAX_DPR } from "./arcGL";
import { type Mode, filterArcs } from "./arcs";
import type { Canon } from "./bible";
import { computeLabels, computeLayout, drawBase, drawTypeArcs, fieldAlpha } from "./mapDraw";
import { type Colors, type Theme, colorsFor } from "./palette";
import type { PaletteId } from "./settingsConfig";
import { SITE_HOST, TAGLINE, TAGLINE_TRACKING, TITLE_PARTS } from "./site";
import { type Entry, THEMES, type ThemeId, type TypeArc } from "./typology";

/** Sizes in layout units; `scale` multiplies them to output pixels. */
export const POSTERS = {
  print: { label: "Print", hint: "24 × 16 in at 300 dpi", width: 1800, height: 1200, scale: 4 },
  screen: { label: "Screen", hint: "4K wallpaper or slides", width: 1920, height: 1080, scale: 2 },
  square: { label: "Square", hint: "Social posts", width: 1080, height: 1080, scale: 2 },
} as const;
export type PosterSize = keyof typeof POSTERS;

export type PosterInput = {
  canon: Canon;
  arcs: Int16Array;
  entries: Entry[];
  typeArcs: TypeArc[];
  mode: Mode;
  minVotes: number;
  theme: Theme;
  palette: PaletteId;
  size: PosterSize;
};

// Typography and spacing, in layout units.
const T = { title: 64, tagline: 15, heading: 22, detail: 15, legend: 13, footer: 14 };
const MARGIN = 0.045; // of width
const GAP = 24; // between the header and the tallest arc
const FOOTER = 56;
const TAGLINE_GAP = 22; // title baseline to tagline top (clears descenders)
const HEADER = T.title + TAGLINE_GAP + T.tagline + GAP; // below the top margin

/**
 * Draws the poster at its print scale, or at `scale` (output pixels per layout
 * unit) for a preview. `gl` lets a caller reuse one WebGL context.
 */
export function renderPoster(p: PosterInput, { scale: at, gl }: { scale?: number; gl?: ArcGL } = {}) {
  const spec = POSTERS[p.size];
  const scale = at ?? spec.scale;
  const { width, height } = spec;
  const C = colorsFor(p.theme, p.palette);
  const m = Math.round(width * MARGIN);
  const filtered = filterArcs(p.canon, p.arcs, p.mode === "all" ? p.minVotes : 1);

  // The map sits between the header and footer, inset by the margin.
  const mapW = width - m * 2;
  const layout = computeLayout(mapW, height - FOOTER - m, m + HEADER);

  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = C.bgCss;
  ctx.fillRect(0, 0, out.width, out.height);

  // The field of arcs, with the live map's shader, always at its full density
  // and then scaled to the output: arcs look the same at every size and in
  // the preview, and print stays light on memory. Text and labels below are
  // drawn at the output resolution.
  const r = gl ?? new ArcGL(document.createElement("canvas"));
  try {
    r.setArcs(filtered.gpu);
    r.draw(layout, MAX_DPR, fieldAlpha(p.mode, C, mapW), C.bg, C.light);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(r.canvasElement, m * scale, 0, layout.width * scale, layout.height * scale);
  } finally {
    if (!gl) r.destroy();
  }

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.save();
  ctx.translate(m, 0);
  if (p.mode === "types") drawTypeArcs(ctx, p.canon, layout, p.typeArcs, p.entries, C, { weight: 1.5 });
  drawBase(ctx, p.canon, layout, computeLabels(p.canon, layout, C), C);
  ctx.restore();

  drawHeader(ctx, p, C, width, m, filtered.keep.length);
  if (p.mode === "types") drawLegend(ctx, C, width, height - FOOTER - m * 0.4, m);
  drawFooter(ctx, C, width, height, m);
  return out;
}

function drawHeader(ctx: CanvasRenderingContext2D, p: PosterInput, C: Colors, width: number, m: number, count: number) {
  const fg = `rgb(${C.fg})`;
  const titleY = m + T.title * 0.8;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  let x = m;
  for (const part of TITLE_PARTS) {
    const amp = part === "&";
    ctx.font = `${amp ? "" : "italic "}500 ${T.title}px ${C.display}`;
    ctx.fillStyle = amp ? C.accent : fg;
    ctx.fillText(part, x, titleY);
    x += ctx.measureText(part).width;
  }

  ctx.font = `500 ${T.tagline}px ${C.serif}`;
  ctx.letterSpacing = `${T.tagline * TAGLINE_TRACKING}px`;
  ctx.fillStyle = C.text;
  ctx.fillText(TAGLINE.toUpperCase(), m, titleY + TAGLINE_GAP + T.tagline);
  ctx.letterSpacing = "0px";

  // What this map shows, on the right.
  const [heading, detail] =
    p.mode === "types"
      ? ["Named in the New Testament", `${p.entries.length} types and shadows, over the field of cross-references`]
      : ["Every cross-reference", `${count.toLocaleString()} connections${p.minVotes > 1 ? ` · ${p.minVotes}+ votes` : ""}`];
  ctx.textAlign = "right";
  ctx.font = `italic ${T.heading}px ${C.display}`;
  ctx.fillStyle = fg;
  ctx.fillText(heading, width - m, m + T.heading * 1.6);
  ctx.font = `${T.detail}px ${C.serif}`;
  ctx.fillStyle = C.text;
  ctx.fillText(detail, width - m, m + T.heading * 1.6 + T.detail * 1.6);
}

/** The type themes as colored dashes, centered in rows above the footer. */
function drawLegend(ctx: CanvasRenderingContext2D, C: Colors, width: number, bottom: number, m: number) {
  ctx.font = `${T.legend}px ${C.serif}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const DASH = 16;
  const SPACE = 26;
  const items = (Object.keys(THEMES) as ThemeId[]).map((t) => ({ t, w: DASH + 8 + ctx.measureText(THEMES[t].label).width }));
  // Greedy rows that fit between the margins.
  const rows: (typeof items)[] = [[]];
  let used = 0;
  for (const it of items) {
    if (used && used + SPACE + it.w > width - m * 2) {
      rows.push([]);
      used = 0;
    }
    used += (used ? SPACE : 0) + it.w;
    rows[rows.length - 1].push(it);
  }
  rows.forEach((row, r) => {
    const rowW = row.reduce((a, it) => a + it.w, 0) + SPACE * (row.length - 1);
    let x = (width - rowW) / 2;
    const y = bottom - (rows.length - 1 - r) * T.legend * 1.7;
    for (const { t, w } of row) {
      ctx.fillStyle = C.ink(THEMES[t].color);
      ctx.fillRect(x, y - 5, DASH, 3);
      ctx.fillStyle = C.text;
      ctx.fillText(THEMES[t].label, x + DASH + 8, y);
      x += w + SPACE;
    }
  });
}

function drawFooter(ctx: CanvasRenderingContext2D, C: Colors, width: number, height: number, m: number) {
  const y = height - m * 0.6;
  ctx.font = `italic ${T.footer}px ${C.serif}`;
  ctx.fillStyle = C.text;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText("Cross-references: OpenBible.info (CC BY) · Scripture texts in the public domain", m, y);
  ctx.textAlign = "right";
  ctx.fillText(SITE_HOST, width - m, y);
}

/** Renders the full-size poster and returns it as a PNG file. */
export async function posterFile(p: PosterInput): Promise<File> {
  const canvas = renderPoster(p);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
  canvas.width = canvas.height = 0; // free the pixels
  const name = `types-and-shadows-${p.mode === "types" ? "types" : "cross-references"}-${p.size}-${p.theme}.png`;
  return new File([blob], name, { type: "image/png" });
}
