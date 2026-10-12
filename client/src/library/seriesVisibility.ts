/*
 * Which series a line chart's legend has hidden. View state only: never stored, and reset when the
 * chart's set of series changes.
 */

/** Identifies a set of series regardless of order, for resetting when it changes. */
export const seriesSetKey = (ndcs: string[]) => [...new Set(ndcs)].sort().join("|");

/** False for the last shown series of a group (one unit chart): a chart is never empty. */
export const canHide = (hidden: ReadonlySet<string>, ndc: string, group: string[]) =>
  group.some(other => other !== ndc && !hidden.has(other));

/** Shows a hidden series, or hides a shown one unless it is the last shown in its group. */
export function toggleSeries(hidden: ReadonlySet<string>, ndc: string, group: string[]): ReadonlySet<string> {
  const next = new Set(hidden);
  if (next.has(ndc)) next.delete(ndc);
  else if (canHide(hidden, ndc, group)) next.add(ndc);
  else return hidden;
  return next;
}

/** Shows every series of a group, leaving other groups' toggles alone. */
export function showGroup(hidden: ReadonlySet<string>, group: string[]): ReadonlySet<string> {
  const next = new Set(hidden);
  for (const ndc of group) next.delete(ndc);
  return next;
}

export const visibleSeries = (ndcs: string[], hidden: ReadonlySet<string>) => ndcs.filter(ndc => !hidden.has(ndc));
