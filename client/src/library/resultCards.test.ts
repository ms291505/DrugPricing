import { describe, expect, it } from "vitest";
import { latestOrder, madeCardsInOrder, NOTABLE_GONE, trackNotable, type MadeCard } from "./resultCards";

type Card = { id: string, order: number };
const card = (id: string, order: number): Card => ({ id, order });
const ids = (cards: MadeCard<Card, Card>[]) =>
  cards.map(made => made.kind === "notable" ? "notable" : `${made.kind}:${made.card.id}`);

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

  it("places Notable by its order, after the cards it ties with", () => {
    const charts = [card("c1", 1), card("c2", 3)];
    expect(ids(madeCardsInOrder(charts, [], { order: -Infinity }))).toEqual(["notable", "chart:c1", "chart:c2"]);
    expect(ids(madeCardsInOrder(charts, [card("s1", 2)], { order: 3 }))).toEqual(["chart:c1", "scan:s1", "chart:c2", "notable"]);
  });

  it("breaks a tie by kind, then by each list's order, and handles empty lists", () => {
    expect(ids(madeCardsInOrder([card("c1", 1), card("c2", 1)], [card("s1", 1)]))).toEqual(["chart:c1", "chart:c2", "scan:s1"]);
    expect(madeCardsInOrder([], [])).toEqual([]);
  });
});

describe("latestOrder", () => {
  it("is the newest card's order, or -Infinity without cards", () => {
    expect(latestOrder([card("c1", 1), card("c2", 4)], [card("s1", 2)])).toBe(4);
    expect(latestOrder([], [])).toBe(-Infinity);
  });
});

describe("trackNotable", () => {
  // Renders in turn: each is [shown, gone, latest order of the other cards].
  const run = (...renders: [boolean, boolean, number][]) =>
    renders.reduce((place, [shown, gone, latest]) => trackNotable(place, shown, gone, latest), NOTABLE_GONE);

  it("comes first with a new result, before every card made after it", () => {
    expect(run([true, false, -Infinity])).toEqual({ gone: false, order: -Infinity });
  });

  it("keeps its place while it stays open, however many cards are added or the dates change", () => {
    expect(run([true, false, -Infinity], [true, false, 5], [true, false, 9])).toEqual({ gone: false, order: -Infinity });
  });

  it("goes after the cards already there when it comes back, so it moves none of them", () => {
    // Closed, three charts added, then new dates reopen it.
    expect(run([true, false, -Infinity], [false, true, -Infinity], [false, true, 7], [true, false, 7]))
      .toEqual({ gone: false, order: 7 });
    // Filters left no notable changes, then a filter change brought some back.
    expect(run([true, false, 2], [false, true, 4], [true, false, 4]).order).toBe(4);
  });

  it("keeps its place while a fetch empties the page", () => {
    expect(run([true, false, -Infinity], [false, false, 3], [true, false, 3])).toEqual({ gone: false, order: -Infinity });
  });

  it("returns the same place when nothing changed", () => {
    const open = { gone: false, order: 1 };
    expect(trackNotable(open, true, false, 5)).toBe(open);
    expect(trackNotable(NOTABLE_GONE, false, true, 5)).toBe(NOTABLE_GONE);
    expect(trackNotable(NOTABLE_GONE, false, false, 5)).toBe(NOTABLE_GONE);
  });
});
