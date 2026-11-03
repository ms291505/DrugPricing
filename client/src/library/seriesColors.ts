/*
 * Series colors. Each NDC prefers the palette slot of its position in the unfiltered search
 * result, so filters never change what it prefers. Clashes among the series actually shown are
 * resolved once for the whole page (`assignSeriesColors`), so every chart on a page agrees and
 * no two visible series share a color while there are no more of them than palette colors.
 */

/**
 * A pinned chart's stored series color in the current palette: a color from a retired palette
 * takes the same slot in `palette`, so pins follow a palette change. Others are kept.
 */
export function seriesColorInPalette(color: string, palette: string[], retired: string[][]): string {
  const same = (c: string) => c.toLowerCase() === color.toLowerCase();
  if (palette.some(same)) return color;
  for (const old of retired) {
    const slot = old.findIndex(same);
    if (slot >= 0) return palette[slot % palette.length];
  }
  return color;
}

/** Each NDC's preferred palette slot: its position among the NDCs, in order of appearance. */
export function preferredSlots(ndcs: Iterable<string>): Map<string, number> {
  const slots = new Map<string, number>();
  for (const ndc of ndcs) if (!slots.has(ndc)) slots.set(ndc, slots.size);
  return slots;
}

/**
 * Colors for the visible NDCs. In order of preference slot, each takes its preferred color, or
 * the first color no earlier series took. Once every color is taken, series fall back to their
 * preferred color and repeats are unavoidable.
 *
 * @param visibleNdcs - the NDCs shown (after page filters)
 * @param preferred - slots from the unfiltered result (`preferredSlots`); unknown NDCs go last
 */
export function assignSeriesColors(visibleNdcs: Iterable<string>, preferred: Map<string, number>, palette: string[]): Map<string, string> {
  const slotOf = (ndc: string) => preferred.get(ndc) ?? Number.MAX_SAFE_INTEGER;
  const ndcs = [...new Set(visibleNdcs)].sort((a, b) => slotOf(a) - slotOf(b));
  const taken = new Set<number>();
  const colors = new Map<string, string>();
  for (const [order, ndc] of ndcs.entries()) {
    const slot = preferred.has(ndc) ? slotOf(ndc) % palette.length : order % palette.length;
    const free = taken.has(slot) ? [...palette.keys()].find(i => !taken.has(i)) : slot;
    const chosen = free ?? slot;
    taken.add(chosen);
    colors.set(ndc, palette[chosen]);
  }
  return colors;
}
