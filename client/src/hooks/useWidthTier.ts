import { useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "@mui/material";

/** An element's own width against the theme's breakpoints: below `sm`, below `md`, or `md` and up. */
export type WidthTier = "narrow" | "medium" | "wide";

const tierOf = (width: number, sm: number, md: number): WidthTier => width >= md ? "wide" : width >= sm ? "medium" : "narrow";

/**
 * Which width tier an element is in, from its own width rather than the window's: a panel in a
 * workspace pane, beside the drawer, is narrower than the window. Re-renders only when the tier
 * changes, not on every resize.
 *
 * @returns the ref to put on the element, and its tier (the window's until it's measured)
 */
export default function useWidthTier<T extends HTMLElement>(): [RefObject<T | null>, WidthTier] {
  const { sm, md } = useTheme().breakpoints.values;
  const ref = useRef<T>(null);
  const [tier, setTier] = useState(() => tierOf(window.innerWidth, sm, md));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Reports come before the paint, the first one included. A hidden tab (`content-visibility:
    // hidden`) reports nothing, or 0, until it's shown, so its tier may be stale by then: render
    // the new one at once, or the tab paints its old layout for a frame and then jumps.
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.borderBoxSize[0]?.inlineSize ?? 0;
      if (width > 0) flushSync(() => setTier(tierOf(width, sm, md)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [sm, md]);

  return [ref, tier];
}
