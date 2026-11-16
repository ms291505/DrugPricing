import { describe, expect, it } from "vitest";
import { copySearchToWorkspace } from "./workspaceSearch";
import { createFdaCriteria, createNadacCriteria } from "./searchCriteria";
import type { PersistedSearchTab } from "./persist";
import type { ChartItem } from "./explorerItems";

const pin: ChartItem = {
  id: "snapshot", kind: "chart", defaultTitle: "Earlier search", createdAt: 1,
  collapsed: false, layout: { width: "half" }, chartType: "line",
  series: [{ ndc: "A", label: "Drug", unit: "each", points: [[100, 5]], packageNdcs: ["package-A"] }],
  dateWindow: { start: 0, end: 200 },
  source: { searchLabel: "earlier", seriesKind: "product", seriesCount: 1, resultSeriesCount: 1, filtered: false },
};

const cases: PersistedSearchTab[] = [
  { type: "fda", criteria: { ...createFdaCriteria(), proprietaryName: "eliquis", includeSamplePackages: true,
    excludedRoutes: ["ORAL"] }, detailLevel: "package", pinnedItems: [pin] },
  { type: "nadac", criteria: { ...createNadacCriteria(), ndcDescription: "eliquis", brandGeneric: "brand",
    excludedUnits: ["GM"] }, pinnedItems: [pin] },
];

describe("copySearchToWorkspace", () => {
  it.each(cases)("freezes the applied dates and preserves $type refinements and snapshot dates", state => {
    const dates = { start: 10, end: 50 };
    const copy = copySearchToWorkspace(state, dates);
    expect(copy).toEqual({ ...state, criteria: { ...state.criteria, dates: { kind: "window", dateWindow: dates } } });
    expect(copy.pinnedItems[0].dateWindow).toEqual({ start: 0, end: 200 });
    dates.start = 20;
    expect(copy.criteria.dates).toEqual({ kind: "window", dateWindow: { start: 10, end: 50 } });
    copy.pinnedItems[0].series[0].points[0][1] = 999;
    expect(state.pinnedItems[0].series[0].points[0][1]).toBe(5);
    expect(copy.criteria).not.toBe(state.criteria);
    expect(copy.pinnedItems).not.toBe(state.pinnedItems);
    expect(copy.pinnedItems[0].series[0].packageNdcs).toEqual(["package-A"]);
  });
});
