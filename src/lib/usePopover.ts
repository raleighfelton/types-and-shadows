"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Calls `onEscape` on Escape while `active`. Listens in the capture phase and
 * stops the event, so closing a menu or dialog doesn't also trigger the page's
 * own Escape handling (clearing the selection, closing the panel).
 */
export function useEscape(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onEscape();
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [onEscape, active]);
}

/** Open state for a menu or tip that closes on an outside click or Escape. */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  useEscape(() => setOpen(false), open);
  return { open, setOpen, ref };
}
