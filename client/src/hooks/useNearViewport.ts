import { useEffect, useRef, useState } from "react";

/** How far outside the viewport an element counts as near: one screen above and below. */
const NEAR_MARGIN = "100% 0px";

/**
 * Whether the element has come within a screen of the viewport. Once it has, it stays true, so
 * what it gates is drawn once and kept: scrolling back never redraws it. Inside a hidden tab
 * (`content-visibility: hidden`) nothing intersects, so it waits until the tab is shown.
 */
export default function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  // Without IntersectionObserver, everything counts as near.
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (near || !element) return;
    const observer = new IntersectionObserver(
      entries => { if (entries.some(entry => entry.isIntersecting)) setNear(true); },
      { rootMargin: NEAR_MARGIN });
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  return { ref, near };
}
