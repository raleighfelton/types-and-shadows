"use client";

import { useEffect, useRef } from "react";

/**
 * Gives an overlay its own history entry while `open`, so the back gesture
 * calls `onClose`. Closing it any other way pops the entry again, so it
 * doesn't leave a dead step in the back stack.
 */
export function useHistoryEntry(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    history.pushState({ ...history.state, overlay: true }, "");
    let popped = false;
    const onPop = () => {
      popped = true;
      close.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!popped) history.back();
    };
  }, [open]);
}
