import data from "@/data/typology.json";
import { type Canon, type Passage, parsePassage } from "./bible";

export type TierId = keyof typeof data.tiers;
export type ThemeId = keyof typeof data.themes;

export type Entry = {
  id: string;
  title: string;
  tier: TierId;
  theme: ThemeId;
  word?: string;
  note: string;
  shadow: Passage[];
  substance: Passage[];
  anchor: Passage;
};

export const THEMES = data.themes as Record<ThemeId, { label: string; color: string }>;
export const TIERS = data.tiers as Record<TierId, { label: string; description: string }>;

export function resolveEntries(canon: Canon): Entry[] {
  return data.entries.map((e) => ({
    ...e,
    tier: e.tier as TierId,
    theme: e.theme as ThemeId,
    shadow: e.shadow.map((s) => parsePassage(canon, s)),
    substance: e.substance.map((s) => parsePassage(canon, s)),
    anchor: parsePassage(canon, e.anchor),
  }));
}

/** One arc per shadow → substance pair. */
export type TypeArc = { entry: number; a: number; b: number; primary: boolean };

export function typeArcs(entries: Entry[]): TypeArc[] {
  const arcs: TypeArc[] = [];
  entries.forEach((e, i) => {
    for (const s of e.shadow) {
      for (const t of e.substance) {
        const primary = s === e.shadow[0] && t.from <= e.anchor.from && e.anchor.from <= t.to;
        arcs.push({ entry: i, a: s.from, b: t.from, primary });
      }
    }
  });
  // Primary arcs last so they draw on top.
  return arcs.sort((x, y) => Number(x.primary) - Number(y.primary));
}

export function entriesTouching(entries: Entry[], idx: number): number[] {
  const hit = (p: Passage) => p.from <= idx && idx <= p.to;
  return entries.flatMap((e, i) => (e.shadow.some(hit) || e.substance.some(hit) ? [i] : []));
}

/** Tooltip text for a curated entry on either map. */
export function entryTip(e: Entry) {
  return { title: e.title, sub: `${e.shadow[0].label} → ${e.anchor.label}` };
}
