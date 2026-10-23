// Server-side data access for generated images. Reads generated files from
// public/data on disk at build time, or over HTTP from the site at request
// time (Vercel doesn't ship public/ inside serverless functions).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type Canon, type TranslationId, TRANSLATIONS, buildCanon, fromIndex } from "@/lib/bible";

// The data only changes between deploys, so each file is read once per
// server instance and shared by every request after.
const cache = new Map<string, Promise<unknown>>();

export function readData<T>(rel: string, origin?: string): Promise<T> {
  if (!cache.has(rel)) {
    const load = async () => {
      if (origin) {
        const r = await fetch(new URL(`/data/${rel}`, origin));
        if (!r.ok) throw new Error(`${r.status} /data/${rel}`);
        return r.json();
      }
      return JSON.parse(await readFile(join(process.cwd(), "public", "data", rel), "utf8"));
    };
    // Don't cache failures.
    cache.set(rel, load().catch((e) => (cache.delete(rel), Promise.reject(e))));
  }
  return cache.get(rel) as Promise<T>;
}

let canon: Promise<Canon> | null = null;
export function loadCanonFrom(origin?: string): Promise<Canon> {
  canon ??= readData<Parameters<typeof buildCanon>[0]>("books.json", origin).then(buildCanon);
  return canon;
}

export type OgArcs = { total: number; arcs: [number, number, number][] };
export const loadOgArcs = (origin?: string) => readData<OgArcs>("og-arcs.json", origin);

/** Text of a verse range (may cross chapters and books), joined. */
export async function passageText(canon: Canon, translation: TranslationId, from: number, to: number, origin?: string) {
  const first = fromIndex(canon, from).book;
  const last = fromIndex(canon, to).book;
  const books = await Promise.all(
    Array.from({ length: last - first + 1 }, (_, k) => readData<string[][]>(`text/${translation}/${first + k}.json`, origin)),
  );
  const parts: string[] = [];
  for (let i = from; i <= to; i++) {
    const r = fromIndex(canon, i);
    const t = books[r.book - first][r.chapter - 1][r.verse - 1];
    if (t) parts.push(t);
  }
  return parts.join(" ");
}

export function isTranslation(t: string | null): t is TranslationId {
  return TRANSLATIONS.some((x) => x.id === t && x.available);
}

const fontDir = join(process.cwd(), "src", "og", "fonts");
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" | "italic" }[]> | null = null;
/** The site's typefaces, for ImageResponse. */
export function loadFonts() {
  const f = (file: string) => readFile(join(fontDir, file));
  fonts ??= Promise.all([
    f("cormorant-garamond-latin-500-normal.woff"),
    f("cormorant-garamond-latin-500-italic.woff"),
    f("eb-garamond-latin-400-normal.woff"),
    f("eb-garamond-latin-400-italic.woff"),
    f("eb-garamond-latin-600-normal.woff"),
  ]).then(([cn, ci, gn, gi, gb]) => [
    { name: "Cormorant", data: cn, weight: 500, style: "normal" },
    { name: "Cormorant", data: ci, weight: 500, style: "italic" },
    { name: "Garamond", data: gn, weight: 400, style: "normal" },
    { name: "Garamond", data: gi, weight: 400, style: "italic" },
    { name: "Garamond", data: gb, weight: 600, style: "normal" },
  ]);
  return fonts;
}

/** Shortens text to about `max` characters on a word boundary. */
export function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\s]+$/, "")}…`;
}
