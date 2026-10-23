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
  };
}

export async function typeCard(e: Entry, canon: Canon, translation: TranslationId, format: Format, origin?: string): Promise<CardModel> {
  const text = (from: number, to: number) =>
    passageText(canon, translation, from, to, origin).then((t) => clip(t, SCALE[format].chars));
  const s = e.shadow[0];
  // The substance passage that contains the anchor verse.
  const t = e.substance.find((p) => p.from <= e.anchor.from && e.anchor.from <= p.to) ?? e.substance[0];
  const [left, right] = await Promise.all([text(s.from, s.to), text(t.from, t.to)]);
  return {
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
  const [left, right] = await Promise.all([text(a, a), text(b, bEnd)]);
  return {
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
  const S = SCALE[format];
  const { width, height } = FORMATS[format];
  const K = cardColors(P, light, model.color);
  const wide = format === "wide";

  const side = (s: Side) => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: S.small * 0.8, marginBottom: S.small * 0.6 }}>
        {s.label && <div style={{ fontFamily: "Cormorant", fontStyle: "italic", fontSize: S.label, color: P.fg }}>{s.label}</div>}
        <div style={{ fontFamily: "Garamond", fontWeight: 600, fontSize: S.small, letterSpacing: 2, color: K.accent }}>
          {s.ref.toUpperCase()}
        </div>
      </div>
      <div style={{ fontFamily: "Garamond", fontSize: S.body, lineHeight: 1.45, color: P.fg }}>{s.text}</div>
    </div>
  );

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: P.ink, padding: S.pad, fontFamily: "Garamond" }}>
      <ArcBand arcs={arcs} width={width - S.pad * 2} height={S.band} light={light} highlight={model.arc} color={K.arc} />
      <div style={{ height: 2, background: mix(P.ink, P.fg, 0.4), marginBottom: S.pad * 0.55 }} />
      <div style={{ fontSize: S.small, letterSpacing: 3, color: K.accent, fontWeight: 600 }}>{model.kicker.toUpperCase()}</div>
      <div style={{ fontFamily: "Cormorant", fontSize: S.title, lineHeight: 1.05, color: P.fg, marginTop: S.small * 0.5, marginBottom: S.pad * 0.5 }}>
        {model.title}
      </div>
      <div style={{ display: "flex", flexDirection: wide ? "row" : "column", gap: wide ? 48 : S.pad * 0.5, flex: 1 }}>
        {side(model.left)}
        {!wide && <div style={{ display: "flex", justifyContent: "center", color: K.arc, fontSize: S.label }}>↓</div>}
        {side(model.right)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", color: K.muted, fontSize: S.small }}>
        <div style={{ fontFamily: "Cormorant", fontStyle: "italic", fontSize: S.label * 0.9, color: P.fg }}>{SITE_NAME}</div>
        <div style={{ letterSpacing: 2 }}>{SITE_HOST.toUpperCase()}</div>
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
