import { useCallback, useState, type KeyboardEvent } from "react";

/**
 * A chart point the user locked the docked readout to (a line chart's date, a bar chart's NDC).
 * Click or tap locks the point under the pointer and a second click unlocks; Enter or Space lock
 * the point the arrow keys reached, and Esc unlocks.
 *
 * @param currentKey - the point the pointer or the keys last made active, if any
 */
export default function useLockedPoint<Key extends string | number>(currentKey: () => Key | undefined) {
  const [locked, setLocked] = useState<Key | null>(null);

  /** Unlocks if locked, else locks `key` (when there is one). */
  const toggle = useCallback((key: Key | undefined) => {
    setLocked(prev => prev !== null ? null : key ?? null);
  }, []);
  const unlock = useCallback(() => setLocked(null), []);

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
