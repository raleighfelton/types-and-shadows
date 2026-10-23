/** Hover tooltip over the map views. */
export default function MapTip({ x, y, title, sub }: { x: number; y: number; title: string; sub: string }) {
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-xs -translate-x-1/2 rounded-sm border border-parchment/15 bg-ink/90 px-3 py-2 backdrop-blur-sm"
      style={{ left: x, top: y }}
    >
      <div className="font-display text-lg leading-tight text-parchment">{title}</div>
      <div className="smallcaps text-[11px] text-muted">{sub}</div>
    </div>
  );
}
