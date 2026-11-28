type Ordered = { order: number };

/** A card in the results grid under the table, by what made it. */
export type MadeCard<C, S> =
  | { kind: "notable" }
  | { kind: "chart", card: C }
  | { kind: "scan", card: S };

/** The newest card's `order`, or `-Infinity` with no card: what a card that comes back goes after. */
export const latestOrder = (...lists: readonly (readonly Ordered[])[]) =>
  Math.max(-Infinity, ...lists.flatMap(list => list.map(card => card.order)));

/**
 * The cards in the results grid, oldest first by `order` (`performance.now()` when Line, Bar or
 * Scan made each), whichever made it, so a new card always goes after the cards already there.
 * Notable price changes takes its `order` from `trackNotable`. A tie keeps charts, then scans,
 * then Notable, each list in its own order (the hooks' are oldest first).
 */
export function madeCardsInOrder<C extends Ordered, S extends Ordered>(
  charts: readonly C[], scans: readonly S[], notable: Ordered | null = null,
): MadeCard<C, S>[] {
  const made: (MadeCard<C, S> & Ordered)[] = [
    ...charts.map(card => ({ kind: "chart" as const, card, order: card.order })),
    ...scans.map(card => ({ kind: "scan" as const, card, order: card.order })),
    ...(notable ? [{ kind: "notable" as const, order: notable.order }] : []),
  ];
  // A stable sort, so ties keep the order above.
  return made.sort((a, b) => a.order - b.order).map(({ order: _order, ...card }) => card as MadeCard<C, S>);
}

/** Where Notable price changes sits: whether it's gone, and its `order` while it's open. */
export type NotablePlace = { gone: boolean, order: number };

/** Before the page's first result: gone, so its first opening takes its place. */
export const NOTABLE_GONE: NotablePlace = { gone: true, order: -Infinity };

/**
 * Notable price changes' place after a render. It opens with each result (when it has changes),
 * and new dates or filters reopen it or take it away. When it opens after being gone (closed, or
 * the shown prices have no notable changes), it goes after the cards already there (`latest`), so
 * it never moves them. While it stays open it keeps its place, and so it does while the page has
 * no prices (a fetch is loading), which isn't a reason for it to move. Returns `prev` when nothing
 * changed.
 *
 * @param shown - it's on screen now
 * @param gone - it was closed, or the shown prices have no notable changes
 * @param latest - `latestOrder` of the page's other cards
 */
export function trackNotable(prev: NotablePlace, shown: boolean, gone: boolean, latest: number): NotablePlace {
  if (gone) return prev.gone ? prev : { ...prev, gone: true };
  if (shown && prev.gone) return { gone: false, order: latest };
  return prev;
}
