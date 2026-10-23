"use client";

import { type RefObject, useEffect, useState } from "react";

export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
