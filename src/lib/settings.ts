"use client";

import { useEffect, useState } from "react";
import type { Theme } from "./palette";
import { DEFAULTS, type FontId, PALETTE_COLORS, type PaletteId, SETTINGS_KEY, type Settings, applySettings } from "./settingsConfig";
import { useMediaQuery } from "./useMediaQuery";

export { SIZES, type PaletteId, type Settings } from "./settingsConfig";

/** Swatches for the menu: [ground, accent] in light and dark. */
export const PALETTES = (Object.keys(PALETTE_COLORS) as PaletteId[]).map((id) => {
  const { name, light, dark } = PALETTE_COLORS[id];
  return { id, name, light: [light.ink, light.accent] as const, dark: [dark.ink, dark.accent] as const };
});

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
