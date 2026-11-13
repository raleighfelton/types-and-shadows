// Share images: a type or a connection, as a card in three sizes.
// Rendered by next/og (Satori): flexbox only, inline styles, every element
// with more than one child needs display: flex.
import { type Canon, type TranslationId, formatRange } from "@/lib/bible";
import { deepen, spanColor } from "@/lib/palette";
import { type PaletteColors, TEXT_MIX } from "@/lib/settingsConfig";
import { FORMATS, type Format } from "@/lib/shareUrl";
import { SITE_HOST, SITE_NAME, TAGLINE } from "@/lib/site";
import { type Entry, THEMES, TIERS } from "@/lib/typology";
import { type OgArcs, clip, passageText } from "./data";

type Side = { label?: string; ref: string; text: string };
export type CardModel = {
  kicker: string;
  /** Theme color for the kicker and the highlighted arc. */
  color: string;
  title: string;
  left: Side;
  right: Side;
  /** The connection to highlight: global verse indexes. */
  arc: [number, number];
  /** The books at each end of the connection, for the link preview. */
  ends: [string, string];
  /** Color of the connection where it isn't the theme color (a cross-reference: the rainbow color of its reach). */
  arcColor?: (light: boolean) => string;
};

// Per-format type scale and text budget (characters per passage).
const SCALE: Record<Format, { pad: number; band: number; title: number; body: number; small: number; label: number; chars: number }> = {
  wide: { pad: 56, band: 150, title: 50, body: 22, small: 15, label: 26, chars: 170 },
  square: { pad: 72, band: 280, title: 68, body: 29, small: 19, label: 34, chars: 230 },
  story: { pad: 88, band: 560, title: 92, body: 38, small: 24, label: 44, chars: 380 },
};

// Colors as [r, g, b]; accepts #rrggbb or rgb(...).
const rgb = (c: string) => (c.startsWith("#") ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g)!.map(Number));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `rgb(${x.map((v, i) => Math.round(v * (1 - t) + y[i] * t)).join(", ")})`;
};

/** Card colors for a palette and theme (the page's tokens, for Satori). */
function cardColors(P: PaletteColors, light: boolean, theme: string) {
  const mixes = TEXT_MIX[light ? "light" : "dark"];
  // Theme colors are tuned for dark; on paper they're deepened like the map's.
  const ink = light ? deepen(theme, 0.35) : theme;
  return {
    muted: mix(P.ink2, P.fg, mixes.muted),
    arc: ink,
    // Theme color readable as text (mirrors --ct): blended toward the foreground.
    accent: mix(ink, P.fg, light ? 0.5 : 0.26),
    /** The rule under the arcs, and the lighter hairline above the footer. */
    rule: mix(P.ink, P.fg, 0.4),
    hairline: mix(P.ink, P.fg, 0.18),
  };
}

const bookName = (canon: Canon, idx: number) => canon.books[canon.verseBook[idx]].name;

export async function typeCard(e: Entry, canon: Canon, translation: TranslationId, format: Format, origin?: string): Promise<CardModel> {
  const text = (from: number, to: number) =>
    passageText(canon, translation, from, to, origin).then((t) => clip(t, SCALE[format].chars));
  const s = e.shadow[0];
  // The substance passage that contains the anchor verse.
  const t = e.substance.find((p) => p.from <= e.anchor.from && e.anchor.from <= p.to) ?? e.substance[0];
  // The link preview shows no passages, so it doesn't load them.
  const [left, right] = format === "wide" ? ["", ""] : await Promise.all([text(s.from, s.to), text(t.from, t.to)]);
  return {
    ends: [bookName(canon, s.from), bookName(canon, e.anchor.from)],
    kicker: `${THEMES[e.theme].label} · ${TIERS[e.tier].label}`,
    color: THEMES[e.theme].color,
    title: e.title,
    left: { label: "Shadow", ref: s.label, text: left },
    right: { label: "Substance", ref: t.label, text: right },
    arc: [s.from, e.anchor.from],
  };
}

export async function pairCard(
  canon: Canon,
  translation: TranslationId,
  format: Format,
  a: number,
  b: number,
  bEnd: number,
  link: string,
  origin?: string,
): Promise<CardModel> {
  const text = (from: number, to: number) =>
    passageText(canon, translation, from, to, origin).then((t) => clip(t, SCALE[format].chars));
  const [left, right] = format === "wide" ? ["", ""] : await Promise.all([text(a, a), text(b, bEnd)]);
  return {
    ends: [bookName(canon, a), bookName(canon, b)],
    arcColor: (light: boolean) => spanColor(Math.sqrt(Math.abs(b - a) / canon.total), light),
    kicker: "Cross-reference",
    color: link,
    title: `${formatRange(canon, a, a)} · ${formatRange(canon, b, bEnd)}`,
    left: { ref: formatRange(canon, a, a), text: left },
    right: { ref: formatRange(canon, b, bEnd), text: right },
    arc: [a, b],
  };
}

/** The rainbow of arcs, with one connection highlighted. */
function ArcBand({
  arcs,
  width,
  height,
  light,
  highlight,
  color,
}: {
  arcs: OgArcs;
  width: number;
  height: number;
  light: boolean;
  highlight?: [number, number];
  color?: string;
}) {
  const hs = Math.min(1, height / (width / 2));
  const x = (i: number) => ((i + 0.5) / arcs.total) * width;
  const d = (a: number, b: number) => {
    const [x1, x2] = [x(Math.min(a, b)), x(Math.max(a, b))];
    const r = Math.max(0.5, (x2 - x1) / 2);
    return `M ${x1} ${height} A ${r} ${r * hs} 0 0 1 ${x2} ${height}`;
  };
  const alpha = highlight ? (light ? 0.22 : 0.18) : light ? 0.4 : 0.32;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {arcs.arcs.map(([a, b], i) => (
        <path key={i} d={d(a, b)} fill="none" stroke={spanColor(Math.sqrt(Math.abs(b - a) / arcs.total), light, alpha)} strokeWidth={1.2} />
      ))}
      {highlight && <path d={d(...highlight)} fill="none" stroke={color} strokeWidth={Math.max(4, width / 160)} strokeLinecap="round" />}
    </svg>
  );
}

export function Card({
  model,
  format,
  colors: P,
  light,
  arcs,
}: {
  model: CardModel;
  format: Format;
  colors: PaletteColors;
  light: boolean;
  arcs: OgArcs;
}) {
  if (format === "wide") return <LinkCard model={model} colors={P} light={light} total={arcs.total} />;
  const S = SCALE[format];
  const { width, height } = FORMATS[format];
  const K = cardColors(P, light, model.color);
  // Square and story stack the passages (the wide link preview is LinkCard, above).
  const stacked: boolean = true;
  /** Vertical rhythm between passages and above the footer. */
  const rhythm = S.small * 0.9;

  // Wide: passages side by side. Square/story: stacked and kept together as one
  // block, centered in the space between the title and the footer.
  const side = (s: Side) => (
    <div style={{ display: "flex", flexDirection: "column", flex: stacked ? "none" : 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: S.small * 0.8, marginBottom: S.small * 0.45 }}>
        {s.label && <div style={{ fontFamily: "Cormorant", fontStyle: "italic", fontSize: S.label, color: P.fg }}>{s.label}</div>}
        <div style={{ fontFamily: "Garamond", fontWeight: 600, fontSize: S.small, letterSpacing: 2, color: K.accent }}>
          {s.ref.toUpperCase()}
        </div>
      </div>
      <div style={{ fontFamily: "Garamond", fontSize: S.body, lineHeight: 1.4, color: P.fg }}>{s.text}</div>
    </div>
  );

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: P.ink, padding: S.pad, fontFamily: "Garamond" }}>
      <ArcBand arcs={arcs} width={width - S.pad * 2} height={S.band} light={light} highlight={model.arc} color={K.arc} />
      <div style={{ height: 2, background: K.rule, marginBottom: S.pad * 0.55 }} />
      <div style={{ fontSize: S.small, letterSpacing: 3, color: K.accent, fontWeight: 600 }}>{model.kicker.toUpperCase()}</div>
      <div style={{ fontFamily: "Cormorant", fontSize: S.title, lineHeight: 1.05, color: P.fg, marginTop: S.small * 0.5, marginBottom: S.pad * 0.5 }}>
        {model.title}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          justifyContent: stacked ? "center" : "flex-start",
          gap: stacked ? rhythm : S.pad * 0.85,
          flex: 1,
        }}
      >
        {side(model.left)}
        {stacked && <div style={{ display: "flex", color: K.arc, fontSize: S.body, lineHeight: 1 }}>↓</div>}
        {side(model.right)}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: K.muted,
          fontSize: S.small,
          marginTop: S.pad * 0.4,
          paddingTop: rhythm,
          borderTop: `1px solid ${K.hairline}`,
        }}
      >
        <div style={{ fontFamily: "Cormorant", fontStyle: "italic", fontSize: S.label * 0.9, color: P.fg }}>{SITE_NAME}</div>
        <div style={{ letterSpacing: 2 }}>{SITE_HOST.toUpperCase()}</div>
      </div>
    </div>
  );
}

/**
 * The link preview (wide): shown small, in a message bubble or a feed, so it
 * says three things and nothing else. The connection as one arc across the
 * Bible, its name, and whose it is.
 */
function LinkCard({ model, colors: P, light, total }: { model: CardModel; colors: PaletteColors; light: boolean; total: number }) {
  const { width, height } = FORMATS.wide;
  const K = cardColors(P, light, model.color);
  const color = model.arcColor?.(light) ?? K.arc;
  const pad = 96;
  const base = 286; // the line of the Bible, Genesis to Revelation
  const x = (i: number) => pad + ((i + 0.5) / total) * (width - pad * 2);
  // A short reach still stands up as a small arch (its ends drawn a little
  // apart, around the true midpoint); a long one stays inside the card.
  const [t1, t2] = [x(Math.min(...model.arc)), x(Math.max(...model.arc))];
  const rx = Math.max(32, (t2 - t1) / 2);
  const mid = Math.min(Math.max((t1 + t2) / 2, pad + rx), width - pad - rx);
  const [x1, x2] = [mid - rx, mid + rx];
  const ry = Math.min(232, Math.max(72, rx * 0.62));
  const d = `M ${x1} ${base} A ${rx} ${ry} 0 0 1 ${x2} ${base}`;

  // Book names under each end, kept apart and inside the card.
  const size = 30;
  const names = (model.arc[0] <= model.arc[1] ? model.ends : [model.ends[1], model.ends[0]]).map((n) => n.toUpperCase());
  const w = names.map((n) => n.length * size * 0.74 + 8);
  let [c1, c2] = [x1, x2];
  const gap = (w[0] + w[1]) / 2 + 28;
  if (c2 - c1 < gap) [c1, c2] = [(x1 + x2 - gap) / 2, (x1 + x2 + gap) / 2];
  const lo = (i: number) => 40 + w[i] / 2;
  const hi = (i: number) => width - 40 - w[i] / 2;
  c1 = Math.min(Math.max(c1, lo(0)), hi(0));
  c2 = Math.min(Math.max(c2, lo(1)), hi(1));
  if (c2 - c1 < gap) {
    if (c1 === lo(0)) c2 = c1 + gap;
    else c1 = c2 - gap;
  }
  const same = names[0] === names[1];
  const label = (text: string, c: number, wd: number) => (
    <div style={{ position: "absolute", left: c - wd / 2, top: base + 26, width: wd, display: "flex", justifyContent: "center", fontFamily: "Garamond", fontWeight: 600, fontSize: size, letterSpacing: 4, color: K.muted }}>
      {text}
    </div>
  );
  // Long names step down a size instead of crowding the card.
  const title = Math.round(Math.min(104, Math.max(62, 2300 / Math.max(12, model.title.length))));

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", alignItems: "center", background: P.ink, position: "relative" }}>
      <svg width={width} height={base + 20} viewBox={`0 0 ${width} ${base + 20}`} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={`M ${pad} ${base} L ${width - pad} ${base}`} stroke={K.rule} strokeWidth={2.5} fill="none" />
        <path d={d} fill="none" stroke={color} strokeOpacity={light ? 0.14 : 0.2} strokeWidth={34} strokeLinecap="round" />
        <path d={d} fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" />
        <circle cx={x1} cy={base} r={15} fill={color} stroke={P.ink} strokeWidth={5} />
        <circle cx={x2} cy={base} r={15} fill={color} stroke={P.ink} strokeWidth={5} />
      </svg>
      {same ? label(names[0], Math.min(Math.max((x1 + x2) / 2, lo(0)), hi(0)), w[0]) : [label(names[0], c1, w[0]), label(names[1], c2, w[1])]}
      <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: base + 74, padding: "0 70px", textAlign: "center", fontFamily: "Cormorant", fontSize: title, lineHeight: 1.04, color: P.fg }}>
        {model.title}
      </div>
      <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontSize: 46, color: P.fg, opacity: 0.9, marginBottom: 44 }}>
        Types <span style={{ color: P.accent, fontStyle: "normal", margin: "0 12px" }}>&amp;</span> Shadows
      </div>
    </div>
  );
}

/** The site's own preview image (wide). */
export function SiteCard({ colors: P, arcs }: { colors: PaletteColors; arcs: OgArcs }) {
  const { width, height } = FORMATS.wide;
  const pad = SCALE.wide.pad;
  const muted = cardColors(P, false, P.accent).muted;
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: P.ink, padding: pad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontSize: 84, color: P.fg, lineHeight: 1 }}>
            Types <span style={{ color: P.accent, fontStyle: "normal", margin: "0 18px" }}>&amp;</span> Shadows
          </div>
          <div style={{ fontFamily: "Garamond", fontSize: 22, letterSpacing: 4, color: muted, marginTop: 18 }}>{TAGLINE.toUpperCase()}</div>
        </div>
        <div style={{ fontFamily: "Garamond", fontSize: 20, letterSpacing: 3, color: muted, marginTop: 12 }}>{SITE_HOST.toUpperCase()}</div>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
        <ArcBand arcs={arcs} width={width - pad * 2} height={360} light={false} />
      </div>
    </div>
  );
}
