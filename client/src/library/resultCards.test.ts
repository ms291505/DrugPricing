import { describe, expect, it } from "vitest";
import { madeCardsInOrder } from "./resultCards";

const card = (id: string, order: number) => ({ id, order });
const ids = (cards: ReturnType<typeof madeCardsInOrder<{ id: string, order: number }, { id: string, order: number }>>) =>
  cards.map(({ kind, card }) => `${kind}:${card.id}`);

describe("madeCardsInOrder", () => {
  it("puts a new chart after a scan made before it, and a new scan after a chart", () => {
    expect(ids(madeCardsInOrder([card("c1", 2)], [card("s1", 1)]))).toEqual(["scan:s1", "chart:c1"]);
    expect(ids(madeCardsInOrder([card("c1", 1)], [card("s1", 2)]))).toEqual(["chart:c1", "scan:s1"]);
  });

  it("interleaves both kinds by when each was made, and keeps each kind's own order", () => {
    const charts = [card("c1", 1), card("c2", 4), card("c3", 5)];
    const scans = [card("s1", 2), card("s2", 3), card("s3", 6)];
    expect(ids(madeCardsInOrder(charts, scans))).toEqual(["chart:c1", "scan:s1", "scan:s2", "chart:c2", "chart:c3", "scan:s3"]);
  });

  it("keeps the remaining cards in place when one closes, and appends the next", () => {
    const charts = [card("c1", 1), card("c3", 5)];
    const scans = [card("s2", 3), card("s4", 7)];
    expect(ids(madeCardsInOrder(charts, scans))).toEqual(["chart:c1", "scan:s2", "chart:c3", "scan:s4"]);
  });

  it("breaks a tie by kind, then by each list's order, and handles empty lists", () => {
    expect(ids(madeCardsInOrder([card("c1", 1), card("c2", 1)], [card("s1", 1)]))).toEqual(["chart:c1", "chart:c2", "scan:s1"]);
    expect(madeCardsInOrder([], [])).toEqual([]);
  });
});
