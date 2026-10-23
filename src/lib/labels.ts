/**
 * Spreads labels along one axis so neighbors stay at least `gap` apart while
 * each stays as close as possible to its ideal position (pool adjacent
 * violators: overlapping runs merge into evenly spaced clusters centered on
 * their members' ideal positions). `ideal` must be sorted ascending.
 */
export function spreadLabels(ideal: number[], gap: number, min: number, max: number): number[] {
  type Cluster = { start: number; n: number; sum: number }; // sum of (ideal - k*gap)
  const clusters: Cluster[] = [];
  const left = (c: Cluster) => c.sum / c.n;
  ideal.forEach((x, i) => {
    clusters.push({ start: i, n: 1, sum: x });
    while (clusters.length > 1) {
      const b = clusters[clusters.length - 1];
      const a = clusters[clusters.length - 2];
      if (left(a) + a.n * gap <= left(b)) break;
      // Merge b into a: b's members shift by a.n slots.
      a.sum += b.sum - b.n * a.n * gap;
      a.n += b.n;
      clusters.pop();
    }
  });
  const out = new Array<number>(ideal.length);
  for (const c of clusters) {
    const l = Math.min(Math.max(left(c), min), Math.max(min, max - (c.n - 1) * gap));
    for (let k = 0; k < c.n; k++) out[c.start + k] = l + k * gap;
  }
  // Clamping can push a cluster into its neighbor. Restore the gap going right,
  // then pull back from the far edge so the last label stays in bounds.
  const last = out.length - 1;
  for (let i = 1; i <= last; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  out[last] = Math.min(out[last], max);
  for (let i = last - 1; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - gap);
  return out;
}
