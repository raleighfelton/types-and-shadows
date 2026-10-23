"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArcGL, MAX_DPR } from "@/lib/arcGL";
import type { Mode } from "@/lib/arcs";
import type { Canon } from "@/lib/bible";
import { downloadFile } from "@/lib/download";
import type { Theme } from "@/lib/palette";
import { POSTERS, type PosterSize, posterFile, renderPoster } from "@/lib/poster";
import type { PaletteId } from "@/lib/settingsConfig";
import type { Entry, TypeArc } from "@/lib/typology";
import { MODE_OPTIONS, PreviewFrame, Segmented, Sheet, THEME_OPTIONS } from "./Controls";

// Download the whole map as an image: either view, print or screen size,
// dark or light. Renders in the browser with the live map's drawing code.

const SIZE_OPTIONS = (Object.keys(POSTERS) as PosterSize[]).map((s) => [s, POSTERS[s].label, POSTERS[s].hint] as const);

export default function PosterSheet({
  mode: initialMode,
  theme: initialTheme,
  onClose,
  ...data
}: {
  canon: Canon;
  arcs: Int16Array;
  entries: Entry[];
  typeArcs: TypeArc[];
  mode: Mode;
  minVotes: number;
  theme: Theme;
  palette: PaletteId;
  onClose: () => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [size, setSize] = useState<PosterSize>("print");
  const [theme, setTheme] = useState(initialTheme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);
  // One WebGL context for every preview while the sheet is open. Created in
  // an effect so a mount/unmount/mount cycle gets a fresh, live context.
  const [gl, setGl] = useState<ArcGL | null>(null);
  useEffect(() => {
    const g = new ArcGL(document.createElement("canvas"));
    setGl(g);
    return () => g.destroy();
  }, []);

  const { canon, arcs, entries, typeArcs, minVotes, palette } = data;
  const input = useMemo(
    () => ({ canon, arcs, entries, typeArcs, minVotes, palette, mode, size, theme }),
    [canon, arcs, entries, typeArcs, minVotes, palette, mode, size, theme],
  );
  const spec = POSTERS[size];

  // The preview renders at its on-screen size (sharp on any display); the
  // arcs are still drawn at full density, so it matches the download.
  useEffect(() => {
    if (!gl) return;
    const id = requestAnimationFrame(() => {
      const target = preview.current;
      if (!target) return;
      const px = Math.round(target.clientWidth * Math.min(window.devicePixelRatio || 1, MAX_DPR));
      const c = renderPoster(input, { scale: px / spec.width, gl });
      target.width = c.width;
      target.height = c.height;
      target.getContext("2d")!.drawImage(c, 0, 0);
      c.width = c.height = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [input, gl, spec.width]);

  async function download() {
    setBusy(true);
    setError(false);
    // Let the button repaint before the (heavy) full-size render.
    await new Promise((r) => setTimeout(r, 30));
    try {
      downloadFile(await posterFile(input));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Download the map" onClose={onClose} wide>
      <PreviewFrame aspect={spec.width / spec.height} maxHeight="48dvh">
        <canvas ref={preview} aria-label="Map preview" className="h-full w-full rounded-md object-contain shadow-lg" />
      </PreviewFrame>

      <Segmented stretch value={mode} onChange={setMode} options={MODE_OPTIONS} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={size} onChange={setSize} options={SIZE_OPTIONS} />
        <Segmented value={theme} onChange={setTheme} options={THEME_OPTIONS} />
      </div>

      <button type="button" disabled={busy} onClick={download} className="control py-2 text-[15px] hover:text-parchment disabled:opacity-60">
        {busy ? "Rendering…" : `Download PNG · ${spec.width * spec.scale} × ${spec.height * spec.scale}`}
      </button>
      <p className="text-meta italic text-muted">
        {error
          ? "This device couldn't render that size. Try Screen or Square, or a computer for Print."
          : `${spec.hint}.${size === "print" ? " Light prints best on most paper." : ""} Cross-references from OpenBible.info (CC BY).`}
      </p>
    </Sheet>
  );
}
