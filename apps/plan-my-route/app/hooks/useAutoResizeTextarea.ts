"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_MIN_HEIGHT_PX = 40;
const DEFAULT_MAX_HEIGHT_PX = 160; // ~10 lines at 1rem line-height

type UseAutoResizeTextareaOptions = {
  value: string;
  minHeightPx?: number;
  maxHeightPx?: number;
};

export function useAutoResizeTextarea({
  value,
  minHeightPx = DEFAULT_MIN_HEIGHT_PX,
  maxHeightPx = DEFAULT_MAX_HEIGHT_PX,
}: UseAutoResizeTextareaOptions) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(
      Math.max(el.scrollHeight, minHeightPx),
      maxHeightPx,
    );
    el.style.height = `${next}px`;
  }, [minHeightPx, maxHeightPx]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return ref;
}
