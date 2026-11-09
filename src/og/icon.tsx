import { STOPS } from "@/lib/palette";
import { PALETTE_COLORS } from "@/lib/settingsConfig";

/** App icon: the rainbow with a cross carved into it, on night blue. Same
 *  geometry as the iOS app's icon, so the two match on a home screen. */
export function IconArt({ size }: { size: number }) {
  const bands = [6, 5, 4, 3, 2].map((i) => STOPS[i][1].map((v) => Math.round(v * 255)).join(","));
  const ink = PALETTE_COLORS.lapis.dark.ink;
  const parchment = PALETTE_COLORS.lapis.dark.fg;
  const cx = size / 2;
  const base = size * 0.655;
  const r0 = size * 0.37;
  const band = size * 0.077;
  const gap = size * 0.02;
  const top = base - (r0 - gap);
  const h = base - top;
  const stem = size * 0.05;
  const arm = size * 0.235;
  const ay = top + h * 0.3;
  // Satori (the OG renderer) has no fragments, so the cross is a keyed list.
  const cross = (t: number, aw: number, y0: number, fill: string) => [
    <rect key={`${fill}-stem`} x={cx - t / 2} y={y0} width={t} height={base + gap - y0} fill={fill} />,
    <rect key={`${fill}-arm`} x={cx - aw / 2} y={ay - t / 2} width={aw} height={t} fill={fill} />,
  ];
  return (
    <div style={{ width: size, height: size, display: "flex", background: ink, borderRadius: size * 0.22 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {bands.map((c, k) => {
          const r = r0 - k * band;
          return (
            <path key={k} d={`M ${cx - r} ${base} A ${r} ${r} 0 0 1 ${cx + r} ${base}`} fill="none" stroke={`rgb(${c})`} strokeWidth={band * 0.9} />
          );
        })}
        {cross(stem + 2 * gap, arm + 2 * gap, top - gap, ink)}
        {cross(stem, arm, top, parchment)}
      </svg>
    </div>
  );
}
