"use client";

import { useRef } from "react";
import { usePopover } from "@/lib/usePopover";

/** Small "i" that explains a control. Opens on hover, focus or tap. */
export default function InfoTip({
  label,
  align = "left",
  children,
}: {
  label: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const { open, setOpen, ref } = usePopover<HTMLSpanElement>();
  const pointer = useRef("");

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        // Mouse users already opened it by hovering; a click shouldn't close it.
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        onClick={() => setOpen((o) => (pointer.current === "mouse" ? true : !o))}
        className="grid h-[18px] w-[18px] place-items-center rounded-full border border-parchment/25 font-display text-[12px] italic leading-none text-soft hover:border-parchment/60 hover:text-parchment"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className={`popover absolute ${align === "left" ? "left-0" : "right-0"} top-[calc(100%+8px)] z-40 block w-64 px-4 py-3 text-[14px] leading-snug text-parchment/80`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
