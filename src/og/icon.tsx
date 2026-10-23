import { STOPS } from "@/lib/palette";
import { PALETTE_COLORS } from "@/lib/settingsConfig";

/** App icon: a small rainbow on night blue. */
export function IconArt({ size }: { size: number }) {
  const bands = [6, 5, 4, 3, 2].map((i) => STOPS[i][1].map((v) => Math.round(v * 255)).join(","));
  const cx = size / 2;
  const base = size * 0.7;
  const w = size * 0.075;
  return (
    <div style={{ width: size, height: size, display: "flex", background: PALETTE_COLORS.lapis.dark.ink, borderRadius: size * 0.22 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {bands.map((c, k) => {
          const r = size * 0.36 - k * w;
          return (
            <path key={k} d={`M ${cx - r} ${base} A ${r} ${r} 0 0 1 ${cx + r} ${base}`} fill="none" stroke={`rgb(${c})`} strokeWidth={w * 0.9} />
          );
        })}
      </svg>
    </div>
  );
}
