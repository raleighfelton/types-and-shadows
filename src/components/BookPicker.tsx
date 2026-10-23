"use client";

import { usePopover } from "@/lib/usePopover";
import type { Canon } from "@/lib/bible";

export default function BookPicker({
  canon,
  current,
  onPick,
}: {
  canon: Canon;
  current: number | null;
  onPick: (book: number | null) => void;
}) {
  const { open, setOpen, ref } = usePopover();

  const group = (label: string, from: number, to: number) => (
    <div>
      <div className="smallcaps mb-2 px-1 text-meta text-muted">{label}</div>
      <div className="grid grid-cols-5 gap-x-1 gap-y-[2px]">
        {canon.books.slice(from, to).map((b, k) => {
          const i = from + k;
          return (
            <button
              key={b.osis}
              type="button"
              title={b.name}
              onClick={() => {
                onPick(i);
                setOpen(false);
              }}
              className={`rounded-sm px-1 py-[3px] text-left text-[14px] hover:bg-parchment/5 hover:text-parchment ${
                i === current ? "text-gold" : "text-soft"
              }`}
            >
              {b.short}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="control smallcaps flex items-center gap-2"
      >
        <span className="text-muted">Book</span>
        <span className="text-parchment">{current === null ? "All" : canon.books[current].short}</span>
        <svg width="9" height="6" viewBox="0 0 9 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" fill="none" strokeWidth="1.2" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Choose a book" className="popover absolute right-0 top-[calc(100%+8px)] z-30 w-[22rem] space-y-4 p-4">
          <button
            type="button"
            onClick={() => {
              onPick(null);
              setOpen(false);
            }}
            className={`font-display text-lg italic hover:text-parchment ${current === null ? "text-gold" : "text-soft"}`}
          >
            Whole Bible (all arcs)
          </button>
          {group("Old Testament", 0, 39)}
          {group("New Testament", 39, 66)}
        </div>
      )}
    </div>
  );
}
