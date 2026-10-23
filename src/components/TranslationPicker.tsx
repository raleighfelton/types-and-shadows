"use client";

import { usePopover } from "@/lib/usePopover";
import { TRANSLATIONS, type TranslationId } from "@/lib/bible";

export default function TranslationPicker({
  value,
  onChange,
}: {
  value: TranslationId;
  onChange: (t: TranslationId) => void;
}) {
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="control smallcaps flex items-center gap-2"
      >
        <span className="text-muted">Text</span>
        <span className="text-parchment">{value}</span>
        <svg width="9" height="6" viewBox="0 0 9 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" fill="none" strokeWidth="1.2" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="popover absolute right-0 top-[calc(100%+8px)] z-30 w-72 py-2"
        >
          {TRANSLATIONS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected={t.id === value}
                disabled={!t.available}
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                className="group flex w-full items-baseline gap-3 px-4 py-2 text-left enabled:hover:bg-parchment/5 disabled:cursor-not-allowed"
              >
                <span
                  className={`smallcaps w-11 shrink-0 text-sm ${
                    t.id === value ? "text-gold" : t.available ? "text-parchment" : "text-muted"
                  }`}
                >
                  {t.id}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[15px] leading-snug ${t.available ? "text-parchment/90" : "text-muted"}`}>
                    {t.name}
                  </span>
                  <span className="block text-xs italic text-muted">
                    {t.note}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
