// Reading settings shared by the client hook (settings.ts) and the pre-paint
// script in layout.tsx. No "use client" here: the server layout needs the
// real values, not client references.

export type ThemePref = "auto" | "dark" | "light";
export type FontId = "classic" | "book" | "clear";
export type PaletteId = "lapis" | "parchment" | "rubric" | "plain";
export type Settings = { theme: ThemePref; font: FontId; size: number; palette: PaletteId };

/** Palette colors per theme. globals.css holds the same values for the page;
 *  these are for places that can't read CSS, like generated share images. */
export type PaletteColors = { ink: string; ink2: string; fg: string; accent: string; link: string };
export const PALETTE_COLORS: Record<PaletteId, { name: string; dark: PaletteColors; light: PaletteColors }> = {
  lapis: {
    name: "Vellum & Lapis",
    dark: { ink: "#0e1220", ink2: "#141a2b", fg: "#e8e6df", accent: "#8ea8e8", link: "#a8c0ff" },
    light: { ink: "#f6f5f1", ink2: "#ecebe6", fg: "#17202f", accent: "#2b4c9b", link: "#2f45e8" },
  },
  parchment: {
    name: "Parchment",
    dark: { ink: "#14110e", ink2: "#1b1713", fg: "#ece3cf", accent: "#d9a441", link: "#ffcf6e" },
    light: { ink: "#f4eee0", ink2: "#ece4d1", fg: "#2e241a", accent: "#7f4c08", link: "#8f4604" },
  },
  rubric: {
    name: "Linen & Rubric",
    dark: { ink: "#121214", ink2: "#1a1a1d", fg: "#ecebe7", accent: "#e0687c", link: "#8fb3ff" },
    light: { ink: "#f5f4f0", ink2: "#ebe9e3", fg: "#1d1c1a", accent: "#a11d2b", link: "#1f56b0" },
  },
  plain: {
    name: "Plain",
    dark: { ink: "#0a0a0b", ink2: "#141416", fg: "#f2f2f0", accent: "#f2f2f0", link: "#ff7a5c" },
    light: { ink: "#fbfbf9", ink2: "#f1f1ee", fg: "#131416", accent: "#131416", link: "#b82c12" },
  },
};

/** Secondary text levels as the foreground's share mixed into ink-2 (the
 *  --muted-mix / --soft-mix values in globals.css). Both pass WCAG AA. */
export const TEXT_MIX = { dark: { muted: 0.6, soft: 0.74 }, light: { muted: 0.72, soft: 0.84 } };

export const SETTINGS_KEY = "reading";
export const DEFAULTS: Settings = { theme: "auto", font: "classic", size: 1, palette: "lapis" };
/** Reading text scale steps. */
export const SIZES = [0.9, 1, 1.12, 1.25, 1.4];

/** Puts settings on <html> as data attributes and the text-scale variable. */
export function applySettings(root: HTMLElement, s: Settings, theme: "dark" | "light") {
  root.dataset.theme = theme;
  root.dataset.font = s.font;
  root.dataset.palette = s.palette;
  root.style.setProperty("--read-scale", String(SIZES[s.size] ?? 1));
}

/** Inline script that applies saved settings before first paint (no flash).
 *  Mirrors applySettings; constants come from this file. */
export const settingsScript = `(function(){try{
var D=${JSON.stringify(DEFAULTS)},S=${JSON.stringify(SIZES)},d=document.documentElement;
var s=Object.assign({},D,JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||"{}"));
d.dataset.theme=s.theme==="auto"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):s.theme;
d.dataset.font=s.font;d.dataset.palette=s.palette;d.style.setProperty("--read-scale",String(S[s.size]||1));
}catch(e){}})()`.replace(/\n/g, "");
