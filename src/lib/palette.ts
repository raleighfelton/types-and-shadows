// Shared colors for both map views, per theme. The rainbow STOPS also feed
// the arc shader (arcGL.ts), so a connection is colored the same everywhere:
// by how far it reaches.

import { PALETTE_COLORS, type PaletteId, TEXT_MIX } from "./settingsConfig";

export type Theme = "dark" | "light";

// A rainbow (Genesis 9:13): the longest reaches form the outer red band, the
// shortest the inner violet, like the bow itself. [span 0..1, rgb 0..1]
export const STOPS: [number, [number, number, number]][] = [
  [0.12, [0.62, 0.34, 0.76]],
  [0.3, [0.36, 0.33, 0.78]],
  [0.44, [0.25, 0.53, 0.86]],
  [0.58, [0.36, 0.7, 0.36]],
  [0.71, [0.95, 0.8, 0.3]],
  [0.83, [0.93, 0.52, 0.2]],
  [0.95, [0.86, 0.27, 0.24]],
];

/** On paper, colors are deepened (gamma) so yellows read as ochre. */
export const LIGHT_GAMMA = 1.45;

function spanRGB(s: number) {
  if (s <= STOPS[0][0]) return STOPS[0][1];
  let i = 1;
  while (i < STOPS.length - 1 && s > STOPS[i][0]) i++;
  const [s0, c0] = STOPS[i - 1];
  const [s1, c1] = STOPS[i];
  const t = Math.min(1, Math.max(0, (s - s0) / (s1 - s0)));
  return c0.map((v, k) => v + (c1[k] - v) * t);
}

/** Rainbow color for a connection reaching s = sqrt(distance / total), as rgba(). */
export function spanColor(s: number, light: boolean, alpha = 1) {
  const c = spanRGB(s).map((v) => Math.round((light ? Math.pow(v, LIGHT_GAMMA) : v) * 255));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

/** Deepen a #rrggbb color for paper: lower lightness, keep (and lift) saturation. */
export function deepen(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  let [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let sat = 0;
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  const L = l * (1 - amount);
  const S = Math.min(1, sat * 1.25);
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs((h % 2) - 1));
  const m = L - C / 2;
  [r, g, b] = h < 1 ? [C, X, 0] : h < 2 ? [X, C, 0] : h < 3 ? [0, C, X] : h < 4 ? [0, X, C] : h < 5 ? [X, 0, C] : [C, 0, X];
  return `rgb(${[r, g, b].map((v) => Math.round((v + m) * 255)).join(", ")})`;
}

const hexRGB = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Map colors for a theme and palette (the same values as the CSS tokens). */
export function colorsFor(theme: Theme, palette: PaletteId) {
  const light = theme === "light";
  const P = PALETTE_COLORS[palette][theme];
  const [bg, fg, link] = [P.ink, P.fg, P.link].map(hexRGB);
  return {
    light,
    /** Foreground as "r, g, b" for rgba() strings. */
    fg: fg.join(", "),
    /** Background for the WebGL clear, 0..1. */
    bg: bg.map((v) => v / 255) as [number, number, number],
    /** The selected connection. */
    link: P.link,
    /** Secondary label text on the map; passes WCAG AA like --color-muted. */
    text: `rgba(${fg.join(", ")}, ${TEXT_MIX[theme].muted})`,
    /** The palette's accent (the "&" in the title, active controls). */
    accent: P.accent,
    /** Background as CSS. */
    bgCss: P.ink,
    /** Halo behind canvas labels. */
    outline: `rgba(${bg.join(", ")}, 0.92)`,
    /** Glow reads as light on a dark sky; on paper it just smudges. */
    glow: (blur: number) => (light ? 0 : blur),
    /** Canvas font families, resolved once per theme. */
    serif: cssFont("--font-garamond"),
    display: cssFont("--font-cormorant"),
    /** Theme colors are tuned for dark; deepen them for paper. */
    ink: (hex: string) => (light ? deepen(hex, 0.35) : hex),
    /** s = sqrt(distance / total), 0..1 */
    span: (s: number, alpha = 1) => spanColor(s, light, alpha),
  };
}

export type Colors = ReturnType<typeof colorsFor>;

/** Resolves a next/font CSS variable to a family list canvas can use. */
export function cssFont(variable: string) {
  if (typeof document === "undefined") return "Georgia, serif";
  const family = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return `${family || "Georgia"}, Georgia, serif`;
}
