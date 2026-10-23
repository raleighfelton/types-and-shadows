// The share link and share image URL format, used by the client (ShareSheet)
// and the server (/s page, /card route). Client-safe: no Node imports.
//   /s?type=serpent                 a curated type
//   /s?a=John.3.14&b=Num.21.8&be=…  a cross-reference (be = end of b, optional)
//   /card?…&t=KJV&f=square&theme=light&p=lapis   the image

export const FORMATS = {
  square: { label: "Square", hint: "Feed posts", width: 1080, height: 1080 },
  story: { label: "Story", hint: "Stories, reels", width: 1080, height: 1920 },
  wide: { label: "Wide", hint: "Links, X, Facebook", width: 1200, height: 630 },
} as const;
export type Format = keyof typeof FORMATS;

export type ShareParams = { type: string } | { a: string; b: string; be?: string };
export type ShareStyle = { t?: string; f?: Format; theme?: "dark" | "light"; p?: string };

export function shareQuery(target: ShareParams, style: ShareStyle = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...target, ...style })) if (v) q.set(k, v);
  return q.toString();
}

/** `v` if it's a key of `obj`, else the default. */
export function pick<K extends string>(v: string | null, obj: Record<K, unknown>, d: K): K {
  return v && Object.hasOwn(obj, v) ? (v as K) : d;
}
