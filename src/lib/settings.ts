"use client";

import { useEffect, useState } from "react";
import type { Theme } from "./palette";
import { DEFAULTS, type FontId, type PaletteId, SETTINGS_KEY, type Settings, applySettings } from "./settingsConfig";
import { useMediaQuery } from "./useMediaQuery";

export { SIZES, type Settings } from "./settingsConfig";

/** Swatches for the menu: [ground, accent] in light and dark. Match globals.css. */
export const PALETTES: { id: PaletteId; name: string; light: [string, string]; dark: [string, string] }[] = [
  { id: "lapis", name: "Vellum & Lapis", light: ["#f6f5f1", "#2b4c9b"], dark: ["#0e1220", "#8ea8e8"] },
  { id: "parchment", name: "Parchment", light: ["#f4eee0", "#7f4c08"], dark: ["#14110e", "#d9a441"] },
  { id: "rubric", name: "Linen & Rubric", light: ["#f5f4f0", "#a11d2b"], dark: ["#121214", "#e0687c"] },
  { id: "plain", name: "Plain", light: ["#fbfbf9", "#131416"], dark: ["#0a0a0b", "#f2f2f0"] },
];

export const FONTS: { id: FontId; name: string; note: string; family: string }[] = [
  { id: "classic", name: "Classic", note: "EB Garamond", family: "var(--font-garamond)" },
  { id: "book", name: "Book", note: "Literata · made for long reading", family: "var(--font-literata)" },
  { id: "clear", name: "Clear", note: "Atkinson Hyperlegible · sans serif", family: "var(--font-atkinson)" },
];

export function useReadingSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const systemLight = useMediaQuery("(prefers-color-scheme: light)");

  useEffect(() => {
    try {
      setSettings({ ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") });
    } catch {}
    setLoaded(true);
  }, []);

  const theme: Theme = settings.theme === "auto" ? (systemLight ? "light" : "dark") : settings.theme;

  // Applied during render (idempotent) so the map canvases, which read the
  // CSS color tokens while rendering, see the new theme in the same pass.
  if (loaded && typeof document !== "undefined") applySettings(document.documentElement, settings, theme);

  useEffect(() => {
    if (loaded) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, loaded]);

  return {
    settings,
    theme,
    update: (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
  };
}
