// Reading settings shared by the client hook (settings.ts) and the pre-paint
// script in layout.tsx. No "use client" here: the server layout needs the
// real values, not client references.

export type ThemePref = "auto" | "dark" | "light";
export type FontId = "classic" | "book" | "clear";
export type PaletteId = "lapis" | "parchment" | "rubric" | "plain";
export type Settings = { theme: ThemePref; font: FontId; size: number; palette: PaletteId };

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
