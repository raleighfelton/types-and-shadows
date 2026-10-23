"use client";

import { useEffect, useState } from "react";
import type { TranslationId } from "@/lib/bible";
import { downloadFile } from "@/lib/download";
import { FORMATS, type Format, type ShareParams, shareQuery } from "@/lib/shareUrl";
import { PreviewFrame, Segmented, Sheet, THEME_OPTIONS } from "./Controls";

// Make a share image for a type or a connection: pick a size and theme,
// then download it, share it (phones) or copy a link with a rich preview.

const FORMAT_OPTIONS = (Object.keys(FORMATS) as Format[]).map((f) => [f, FORMATS[f].label, FORMATS[f].hint] as const);

export default function ShareSheet({
  target,
  name,
  translation,
  onClose,
}: {
  target: ShareParams;
  /** Used for the downloaded file name and share title. */
  name: string;
  translation: TranslationId;
  onClose: () => void;
}) {
  const root = document.documentElement;
  const [format, setFormat] = useState<Format>("square");
  const [theme, setTheme] = useState<"dark" | "light">(root.dataset.theme === "light" ? "light" : "dark");
  const [file, setFile] = useState<{ url: string; file: File } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const imageUrl = `/card?${shareQuery(target, { t: translation, f: format, theme, p: root.dataset.palette })}`;
  const link = `${location.origin}/s?${shareQuery(target, { t: translation })}`;
  const fileName = `types-and-shadows-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${format}.png`;

  // Fetch the image once; the preview, Download and Share all use it. Having
  // the file ready also lets Share run straight from the tap (Safari requires it).
  useEffect(() => {
    let live = true;
    setFile(null);
    fetch(imageUrl)
      .then((r) => r.blob())
      .then((blob) => {
        if (!live) return;
        const f = new File([blob], fileName, { type: "image/png" });
        setFile({ url: URL.createObjectURL(f), file: f });
      });
    return () => {
      live = false;
    };
  }, [imageUrl, fileName]);
  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.url);
    },
    [file],
  );

  const flash = (s: string) => {
    setStatus(s);
    setTimeout(() => setStatus(null), 2200);
  };

  function download() {
    if (file) downloadFile(file.file);
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    flash("Link copied");
  }

  async function share() {
    try {
      if (file && navigator.canShare?.({ files: [file.file] })) await navigator.share({ files: [file.file], title: name, url: link });
      else if (navigator.share) await navigator.share({ title: name, url: link });
      else await copy();
    } catch {
      // Dismissed by the user.
    }
  }

  const { width, height } = FORMATS[format];
  return (
    <Sheet title={`Share ${name}`} onClose={onClose}>
      <PreviewFrame aspect={`${width} / ${height}`} maxHeight="46dvh">
        {file && (
          // eslint-disable-next-line @next/next/no-img-element -- generated on demand
          <img src={file.url} alt={`Share image: ${name}`} className="h-full w-full rounded-md object-contain shadow-lg" />
        )}
      </PreviewFrame>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
        <Segmented value={theme} onChange={setTheme} options={THEME_OPTIONS} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={!file} onClick={download} className="control py-2 text-[15px] hover:text-parchment disabled:opacity-50">
          Download
        </button>
        <button type="button" onClick={share} className="control py-2 text-[15px] hover:text-parchment">
          Share…
        </button>
        <button type="button" onClick={copy} className="control py-2 text-[15px] hover:text-parchment">
          {status ?? "Copy link"}
        </button>
      </div>
      <p className="text-meta italic text-muted">
        Shared links show a preview with this connection. Scripture text: {translation} (public domain).
      </p>
    </Sheet>
  );
}
