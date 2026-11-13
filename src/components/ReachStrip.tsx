"use client";

import { useEffect, useRef } from "react";
import type { Canon } from "@/lib/bible";
import { prep } from "@/lib/canvas";
import type { Colors } from "@/lib/palette";
import { useElementSize } from "@/lib/useElementSize";

/**
 * Where one verse's connections reach, on a single Old Testament → New
 * Testament line: each arc in the rainbow color of its reach, with the books
 * they land in named underneath. The same drawing as the iPhone app's verse page.
 */
export default function ReachStrip({
  canon,
  origin,
  targets,
  highlight,
  colors: C,
  className,
}: {
  canon: Canon;
  origin: number;
  targets: number[];
  /** The selected connection, drawn in the link color while the rest step back. */
  highlight: number | null;
  colors: Colors;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(wrap);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !size.w || !size.h) return;
    const ctx = prep(c, size.w, size.h);
    const w = size.w;
    const base = size.h - 42;
    const x = (i: number) => 6 + ((i + 0.5) / canon.total) * (w - 12);
    const nt = canon.books.find((b) => b.nt)!.start;
    const nx = x(nt);
    const fg = (a: number) => `rgba(${C.fg}, ${a})`;
    const line = (x1: number, x2: number, a: number) => {
      ctx.strokeStyle = fg(a);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, base);
      ctx.lineTo(x2, base);
      ctx.stroke();
    };
    line(6, nx - 3, 0.22);
    line(nx + 3, w - 6, 0.4);

    const ox = x(origin);
    // Longest reaches first, so the short ones stay readable on top.
    const order = [...targets].sort((a, b) => Math.abs(b - origin) - Math.abs(a - origin));
    for (const pass of [false, true]) {
      for (const t of order) {
        const on = t === highlight;
        if (on !== pass) continue;
        const tx = x(t);
        const r = Math.abs(tx - ox) / 2;
        const top = Math.max(7, Math.min(base - 8, r * 0.9 + 5));
        const s = Math.sqrt(Math.abs(t - origin) / canon.total);
        const dim = highlight !== null && !on;
        ctx.strokeStyle = on ? C.link : C.span(s, dim ? 0.3 : 0.95);
        ctx.lineWidth = on ? 2.8 : 1.9;
        ctx.shadowColor = on ? C.link : "transparent";
        ctx.shadowBlur = on ? C.glow(10) : 0;
        ctx.beginPath();
        ctx.moveTo(ox, base);
        ctx.quadraticCurveTo((ox + tx) / 2, base - top * 2, tx, base);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = on ? C.link : C.span(s, dim ? 0.4 : 1);
        ctx.beginPath();
        ctx.arc(tx, base, on ? 4.4 : 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = fg(1);
    ctx.beginPath();
    ctx.arc(ox, base, 6, 0, Math.PI * 2);
    ctx.fill();

    // Name the books the arcs land in, once each, where the names fit.
    ctx.font = `500 13px ${C.serif}`;
    ctx.letterSpacing = "1.1px";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const labels: { x: number; name: string; hot: boolean; own: boolean }[] = [];
    const seen = new Set<number>();
    for (const t of [...targets].sort((a, b) => a - b)) {
      const b = canon.verseBook[t];
      if (!seen.has(b)) {
        seen.add(b);
        labels.push({ x: x(t), name: canon.books[b].short.toUpperCase(), hot: t === highlight, own: false });
      }
    }
    labels.push({ x: ox, name: canon.books[canon.verseBook[origin]].short.toUpperCase(), hot: false, own: true });
    // The verse's own book and the selected one are placed first; the rest fit around them.
    const placed: { l: number; r: number }[] = [];
    for (const L of [...labels].sort((a, b) => Number(b.own) + Number(b.hot) - Number(a.own) - Number(a.hot) || a.x - b.x)) {
      const tw = ctx.measureText(L.name).width;
      const l = Math.min(Math.max(L.x - tw / 2, 2), w - tw - 2);
      if (placed.some((p) => l < p.r + 9 && l + tw > p.l - 9)) continue;
      placed.push({ l, r: l + tw });
      ctx.fillStyle = L.hot ? C.link : L.own ? fg(1) : C.text;
      ctx.fillText(L.name, l, base + 11);
    }
    ctx.font = `500 10px ${C.serif}`;
    ctx.fillStyle = C.text;
    ctx.fillText("OLD TESTAMENT", 6, base + 29);
    ctx.textAlign = "right";
    ctx.fillText("NEW TESTAMENT", w - 6, base + 29);
    ctx.letterSpacing = "0px";
  }, [canon, origin, targets, highlight, C, size]);

  return (
    <div ref={wrap} className={className}>
      <canvas ref={canvas} className="block h-full w-full" aria-hidden />
    </div>
  );
}
