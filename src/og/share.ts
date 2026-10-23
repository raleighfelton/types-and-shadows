// Server side of the share URL format (see lib/shareUrl.ts): resolves the
// parameters against the canon.
import { type Canon, parseRefId, refId } from "@/lib/bible";
import { DEFAULTS, PALETTE_COLORS } from "@/lib/settingsConfig";
import { FORMATS, pick } from "@/lib/shareUrl";
import { type Entry, resolveEntries } from "@/lib/typology";
import { isTranslation } from "./data";

export type ShareTarget =
  | { kind: "type"; entry: Entry }
  | { kind: "pair"; a: number; b: number; bEnd: number };

export function parseTarget(canon: Canon, q: URLSearchParams): ShareTarget | null {
  const type = q.get("type");
  if (type) {
    const entry = resolveEntries(canon).find((e) => e.id === type);
    return entry ? { kind: "type", entry } : null;
  }
  const a = parseRefId(canon, q.get("a") ?? "");
  const b = parseRefId(canon, q.get("b") ?? "");
  if (a === null || b === null) return null;
  const be = parseRefId(canon, q.get("be") ?? "");
  return { kind: "pair", a, b, bEnd: be !== null && be >= b ? be : b };
}

export function parseStyle(q: URLSearchParams) {
  const t = q.get("t");
  return {
    translation: isTranslation(t) ? t : "KJV",
    format: pick(q.get("f"), FORMATS, "square"),
    light: q.get("theme") === "light",
    palette: pick(q.get("p"), PALETTE_COLORS, DEFAULTS.palette),
  };
}

/** Where the share link should land in the app. */
export function appHash(canon: Canon, target: ShareTarget) {
  return target.kind === "type" ? `#type/${target.entry.id}` : `#${refId(canon, target.a)}`;
}
