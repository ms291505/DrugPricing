/**
 * The cards Line, Bar and Scan price changes made, in the results grid after Notable price
 * changes: one list, oldest first by `order` (`performance.now()` when each was made), whichever
 * action made it, so a new card always goes after the cards already there. Within a kind, the
 * input order (each hook's, oldest first) breaks a tie.
 */
export type MadeCard<C, S> = { kind: "chart", card: C } | { kind: "scan", card: S };

export function madeCardsInOrder<C extends { order: number }, S extends { order: number }>(charts: readonly C[], scans: readonly S[]): MadeCard<C, S>[] {
  const made: MadeCard<C, S>[] = [
    ...charts.map(card => ({ kind: "chart" as const, card })),
    ...scans.map(card => ({ kind: "scan" as const, card })),
  ];
  // A stable sort: equal orders keep charts before scans, each in its own order.
  return made.sort((a, b) => a.card.order - b.card.order);
}
