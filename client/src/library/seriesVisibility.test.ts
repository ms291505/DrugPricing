import { describe, expect, it } from "vitest";
import { canHide, seriesSetKey, showGroup, toggleSeries, visibleSeries } from "./seriesVisibility";

describe("seriesVisibility", () => {
  it("toggles a series off and back on", () => {
    const hidden = toggleSeries(new Set(), "A", ["A", "B"]);
    expect([...hidden]).toEqual(["A"]);
    expect([...toggleSeries(hidden, "A", ["A", "B"])]).toEqual([]);
  });

  it("never hides the last shown series of a group", () => {
    const hidden = new Set(["A"]);
    expect(canHide(hidden, "B", ["A", "B"])).toBe(false);
    expect(toggleSeries(hidden, "B", ["A", "B"])).toBe(hidden);
  });

  it("applies the rule per group", () => {
    // C is alone in its unit chart, so it stays even though A and B are shown elsewhere.
    expect(canHide(new Set(), "C", ["C"])).toBe(false);
    expect(canHide(new Set(["C"]), "A", ["A", "B"])).toBe(true);
  });

  it("shows a whole group without touching other groups", () => {
    expect([...showGroup(new Set(["A", "B", "C"]), ["A", "B"])]).toEqual(["C"]);
  });

  it("keys a set of series regardless of order and duplicates", () => {
    expect(seriesSetKey(["B", "A", "B"])).toBe(seriesSetKey(["A", "B"]));
    expect(seriesSetKey(["A"])).not.toBe(seriesSetKey(["A", "B"]));
  });

  it("filters to the visible series in order", () => {
    expect(visibleSeries(["C", "A", "B"], new Set(["A"]))).toEqual(["C", "B"]);
  });
});
