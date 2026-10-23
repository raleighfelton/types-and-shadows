import type { Canon } from "./bible";

export type Mode = "all" | "types";

/** Vote thresholds for the "Every cross-reference" slider. */
export const VOTE_STEPS = [1, 2, 3, 5, 10, 20, 50, 100];

export type FilteredArcs = {
  /** Indexes into arcs.bin of arcs at or above the vote threshold, short → long. */
  keep: Uint32Array;
  /** [x1, x2, votes] per kept arc, x normalized 0..1, for the GPU. */
  gpu: Float32Array;
  /** Arcs touching each chapter (CSR: byChapter[offsets[c] .. offsets[c+1]]). */
  offsets: Uint32Array;
  byChapter: Uint32Array;
};

const cache = new WeakMap<Int16Array, Map<number, FilteredArcs>>();

/** Filters arcs by votes once per threshold; every view shares the result. */
export function filterArcs(canon: Canon, arcs: Int16Array, minVotes: number): FilteredArcs {
  let byVotes = cache.get(arcs);
  if (!byVotes) cache.set(arcs, (byVotes = new Map()));
  const hit = byVotes.get(minVotes);
  if (hit) return hit;

  const { total, verseChapter } = canon;
  const n = arcs.length / 3;
  let count = 0;
  for (let i = 0; i < n; i++) if (arcs[i * 3 + 2] >= minVotes) count++;
  const keep = new Uint32Array(count);
  const gpu = new Float32Array(count * 3);
  const nCh = canon.chapterStarts.length;
  const offsets = new Uint32Array(nCh + 1);
  for (let i = 0, k = 0; i < n; i++) {
    if (arcs[i * 3 + 2] < minVotes) continue;
    const a = arcs[i * 3];
    const b = arcs[i * 3 + 1];
    keep[k] = i;
    gpu[k * 3] = (a + 0.5) / total;
    gpu[k * 3 + 1] = (b + 0.5) / total;
    gpu[k * 3 + 2] = arcs[i * 3 + 2];
    k++;
    offsets[verseChapter[a] + 1]++;
    if (verseChapter[b] !== verseChapter[a]) offsets[verseChapter[b] + 1]++;
  }
  for (let c = 1; c <= nCh; c++) offsets[c] += offsets[c - 1];
  const cursor = offsets.slice();
  const byChapter = new Uint32Array(offsets[nCh]);
  for (const i of keep) {
    const ca = verseChapter[arcs[i * 3]];
    const cb = verseChapter[arcs[i * 3 + 1]];
    byChapter[cursor[ca]++] = i;
    if (cb !== ca) byChapter[cursor[cb]++] = i;
  }
  const out = { keep, gpu, offsets, byChapter };
  byVotes.set(minVotes, out);
  return out;
}
