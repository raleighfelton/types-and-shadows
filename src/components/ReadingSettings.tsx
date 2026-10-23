"use client";

import { usePopover } from "@/lib/usePopover";
import { Segmented } from "./Controls";
import { FONTS, PALETTES, SIZES, type Settings } from "@/lib/settings";

export default function ReadingSettings({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const { open, setOpen, ref } = usePopover();

  const label = "smallcaps mb-2 block text-meta text-muted";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Reading settings"
        onClick={() => setOpen((o) => !o)}
        className="control flex h-[34px] items-center px-3 font-display text-[17px] leading-none"
      >
        A<span className="text-[13px]">a</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Reading settings" className="popover absolute right-0 top-[calc(100%+8px)] z-40 w-[18.5rem] space-y-5 p-4">
          <div>
            <span className={label}>Theme</span>
            <Segmented
              stretch
              value={settings.theme}
              onChange={(theme) => onChange({ theme })}
              options={[
                ["auto", "Auto"],
                ["light", "Light"],
                ["dark", "Dark"],
              ]}
            />
          </div>

          <div>
            <span className={label}>Color</span>
            <div className="grid grid-cols-4 gap-2">
              {PALETTES.map((pal) => {
                const on = settings.palette === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    aria-pressed={on}
                    title={pal.name}
                    onClick={() => onChange({ palette: pal.id })}
                    className="group flex flex-col items-center gap-1"
                  >
                    {/* Split swatch: light half, dark half, each with its accent dot. */}
                    <span
                      className={`relative block h-10 w-10 overflow-hidden rounded-full ring-offset-2 ring-offset-ink-2 transition ${
                        on ? "ring-2 ring-gold" : "ring-1 ring-parchment/20 group-hover:ring-parchment/50"
                      }`}
                      style={{ background: `linear-gradient(135deg, ${pal.light[0]} 50%, ${pal.dark[0]} 50%)` }}
                    >
                      <i className="absolute left-[9px] top-[9px] h-2 w-2 rounded-full" style={{ background: pal.light[1] }} />
                      <i className="absolute bottom-[9px] right-[9px] h-2 w-2 rounded-full" style={{ background: pal.dark[1] }} />
                    </span>
                    <span className={`text-center text-meta leading-tight ${on ? "text-parchment" : "text-muted"}`}>
                      {pal.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={label}>Typeface</span>
            <div className="space-y-1">
              {FONTS.map((f) => {
                const on = settings.font === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ font: f.id })}
                    className={`block w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      on ? "border-gold/60 bg-gold/10" : "border-transparent hover:bg-parchment/5"
                    }`}
                  >
                    <span className="block text-[18px] leading-tight text-parchment" style={{ fontFamily: f.family }}>
                      {f.name} <span className="text-soft">· In the beginning was the Word</span>
                    </span>
                    <span className="block text-meta italic text-muted">{f.note}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={label}>Text size</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Smaller text"
                disabled={settings.size === 0}
                onClick={() => onChange({ size: settings.size - 1 })}
                className="icon-btn text-[15px] disabled:opacity-30"
              >
                A
              </button>
              <div className="flex flex-1 items-center justify-between">
                {SIZES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Text size ${i + 1}`}
                    aria-pressed={settings.size === i}
                    onClick={() => onChange({ size: i })}
                    className={`rounded-full transition-all ${settings.size === i ? "bg-gold" : "bg-parchment/25 hover:bg-parchment/50"}`}
                    style={{ width: 6 + i * 2, height: 6 + i * 2 }}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Larger text"
                disabled={settings.size === SIZES.length - 1}
                onClick={() => onChange({ size: settings.size + 1 })}
                className="icon-btn text-[22px] disabled:opacity-30"
              >
                A
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
