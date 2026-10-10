import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFdaTabState, loadNadacTabState } from "./persist";
import { FULL_WINDOW } from "./dates";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});

const saveRaw = (tabId: string, data: unknown) =>
  store.set(`drugpricing.v1.tab.${tabId}`, JSON.stringify({ version: 1, data }));

// A pinned chart as saved before charts had dates.
const oldItem = {
  kind: "chart", id: "i1", defaultTitle: "Line chart: 1 product", createdAt: 1, layout: { width: "half" },
  collapsed: false, chartType: "line",
  series: [{ ndc: "A", label: "Drug A", unit: "each", points: [[1, 2]] }],
  source: { searchLabel: "humira", seriesKind: "product", seriesCount: 1, resultSeriesCount: 1, filtered: false },
};

beforeEach(() => store.clear());

describe("loading saved tab state", () => {
  it("shows charts saved before chart dates existed over all dates", () => {
    saveRaw("t1", { type: "fda", searchParams: null, pinnedItems: [oldItem] });
    const state = loadFdaTabState("t1");
    expect(state?.pinnedItems).toEqual([{ ...oldItem, dateWindow: FULL_WINDOW }]);
    expect(state?.chartWindow).toEqual(FULL_WINDOW);
    expect(state?.matchScale).toBe(false);
  });

  it("restores chart dates, change spans, and Match scale", () => {
    const dateWindow = { start: 100, end: null };
    const changeSpan = { start: 1, end: 2, label: "-43.0%" };
    saveRaw("t2", {
      type: "nadac", searchParams: null, pinnedItems: [{ ...oldItem, dateWindow, changeSpan }],
      chartWindow: { start: null, end: 200 }, matchScale: true,
    });
    const state = loadNadacTabState("t2");
    expect(state?.pinnedItems[0]).toMatchObject({ dateWindow, changeSpan });
    expect(state?.chartWindow).toEqual({ start: null, end: 200 });
    expect(state?.matchScale).toBe(true);
  });

  it("drops only the malformed items", () => {
    saveRaw("t3", {
      type: "fda", searchParams: null,
      pinnedItems: [
        { ...oldItem, id: "bad-window", dateWindow: { start: "2025-01-01", end: null } },
        { ...oldItem, id: "bad-span", changeSpan: { start: 1 } },
        { ...oldItem, id: "good" },
      ],
      chartWindow: "all",
    });
    const state = loadFdaTabState("t3");
    expect(state?.pinnedItems.map(item => item.id)).toEqual(["good"]);
    expect(state?.chartWindow).toEqual(FULL_WINDOW);
  });
});
