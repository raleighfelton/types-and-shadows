// Small 2D canvas helpers shared by the map views.
import type { Colors } from "./palette";

/** Sizes the backing store only when it changes, clears, and resets state. */
export function prep(c: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  if (c.width !== W || c.height !== H) {
    c.width = W;
    c.height = H;
  }
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  return ctx;
}

/** A filled point, at the current globalAlpha. */
export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, r = 2.6) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Text with a background-colored halo so it reads over busy lines. */
export function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, C: Colors) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** The selected connection: link color with a glow (dark) or a paper edge (light). */
export function strokeLink(ctx: CanvasRenderingContext2D, C: Colors, trace: () => void) {
  ctx.globalAlpha = 1;
  if (C.light) {
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 6;
    trace();
  }
  ctx.strokeStyle = C.link;
  ctx.shadowColor = C.link;
  ctx.shadowBlur = C.glow(16);
  ctx.lineWidth = 2.8;
  trace();
  ctx.shadowBlur = 0;
}
