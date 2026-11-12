import { useState } from "react";

/**
 * Returns the value from an earlier render while `equal` says it hasn't changed, so a memo'd
 * child given a freshly built but equal object (a new `Map` with the same entries) can skip its
 * render.
 */
export default function useStableValue<T>(value: T, equal: (a: T, b: T) => boolean): T {
  const [stable, setStable] = useState(value);
  if (stable === value || equal(stable, value)) return stable;
  setStable(value);
  return value;
}
