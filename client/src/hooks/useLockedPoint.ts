import { useCallback, useState, type KeyboardEvent } from "react";

/**
 * A chart point the user locked the docked readout to (a line chart's date, a bar chart's NDC).
 * Click or tap locks the point under the pointer and a second click unlocks; Enter or Space lock
 * the point the arrow keys reached, and Esc unlocks.
 *
 * A lock on a point the chart no longer has (a new search, or a filter hid it) is dropped, so the
 * readout and hover come back on their own, and the lock doesn't return with the point.
 *
 * @param currentKey - the point the pointer or the keys last made active, if any
 * @param has - whether the chart's current rows hold a point
 */
export default function useLockedPoint<Key extends string | number>(
  currentKey: () => Key | undefined,
  has: (key: Key) => boolean,
) {
  const [stored, setStored] = useState<Key | null>(null);
  // Adjusting state while rendering (React re-renders at once): the lock goes with its point.
  const locked = stored !== null && has(stored) ? stored : null;
  if (stored !== null && locked === null) setStored(null);

  /** Unlocks if locked, else locks `key` (when there is one). */
  const toggle = (key: Key | undefined) => setStored(locked !== null ? null : key ?? null);
  const unlock = useCallback(() => setStored(null), []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && locked !== null) {
      event.stopPropagation();
      unlock();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(currentKey());
    }
  };

  return { locked, toggle, unlock, onKeyDown };
}
