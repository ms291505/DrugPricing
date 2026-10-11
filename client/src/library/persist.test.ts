import { beforeEach, describe, expect, it, vi } from "vitest";
import { FULL_WINDOW } from "./dates";
import { createFdaResultFilter } from "./types";

type Persist = typeof import("./persist");

/**
 * An in-memory localStorage whose stored keys are its own enumerable properties, like the real
 * one, so `Object.keys(localStorage)` (used by `pruneStoredState`) lists them.
 */
function memoryStorage(): Storage {
  const store: Record<string, string> = {};
  Object.defineProperties(store, {
    getItem: { value: (key: string) => Object.hasOwn(store, key) ? store[key] : null },
    setItem: { value: (key: string, value: string) => { store[key] = String(value); } },
    removeItem: { value: (key: string) => { delete store[key]; } },
  });
  return store as unknown as Storage;
}

// `persist.ts` keeps module state (what this window wrote, read-only after a conflict), so each
// test gets a fresh copy of the module and of storage.
let persist: Persist;
beforeEach(async () => {
  vi.unstubAllGlobals();
  vi.stubGlobal("localStorage", memoryStorage());
  vi.resetModules();
  persist = await import("./persist");
  // Only after the import: react-hot-toast assumes a browser when it sees `window`. The watcher
  // needs nothing but its event methods.
  vi.stubGlobal("window", new EventTarget());
});

/** Asserts a load found state, so a failing load reads as "was null" rather than a missing field. */
function loaded<T>(state: T | null): T {
  expect(state).not.toBeNull();
  return state as T;
}

/** Writes a tab's raw payload, for data the app itself would never save. */
const saveRaw = (tabId: string, data: unknown) =>
  localStorage.setItem(persist.tabKey(tabId), JSON.stringify({ version: persist.VERSION, data }));

const fdaSearch = { proprietaryName: "eliquis", includeSamplePackages: false, includeResultsWNoPrices: false };
const nadacSearch = { ndcDescription: "eliquis", ndc: "", minDate: "2025-10-07", maxDate: "2026-10-07" };

// A pinned chart as saved before charts had dates.
const oldItem = {
  kind: "chart", id: "i1", defaultTitle: "Line chart: 1 product", createdAt: 1, layout: { width: "half" },
  collapsed: false, chartType: "line",
  series: [{ ndc: "A", label: "Drug A", unit: "each", points: [[1, 2]] }],
  source: { searchLabel: "humira", seriesKind: "product", seriesCount: 1, resultSeriesCount: 1, filtered: false },
};

describe("loading saved tab state", () => {
  it("round-trips what saveTabState wrote", () => {
    const state = {
      type: "nadac" as const,
      searchParams: nadacSearch,
      excludedNdcDescriptions: ["ELIQUIS 5 MG TABLET"],
      pinnedItems: [{ ...oldItem, dateWindow: { start: 100, end: null }, changeSpan: { start: 1, end: 2, label: "-43.0%" } }],
      chartDates: { kind: "recent" as const, months: 6 },
      matchScale: true,
    } as Parameters<Persist["saveTabState"]>[1];
    persist.saveTabState("t1", state);
    expect(loaded(persist.loadNadacTabState("t1"))).toEqual(state);
  });

  it("shows charts saved before chart dates existed over all dates", () => {
    saveRaw("t1", { type: "fda", searchParams: null, pinnedItems: [oldItem] });
    const state = loaded(persist.loadFdaTabState("t1"));
    expect(state.pinnedItems).toEqual([{ ...oldItem, dateWindow: FULL_WINDOW }]);
    expect(state.chartDates).toEqual({ kind: "window", dateWindow: FULL_WINDOW });
    expect(state.matchScale).toBe(false);
  });

  it("drops only the malformed items and fields", () => {
    saveRaw("t2", {
      type: "fda", searchParams: null,
      pinnedItems: [
        { ...oldItem, id: "bad-window", dateWindow: { start: "2025-01-01", end: null } },
        { ...oldItem, id: "bad-span", changeSpan: { start: 1 } },
        { ...oldItem, id: "good" },
      ],
      chartDates: { kind: "recent", months: 0 },
    });
    const state = loaded(persist.loadFdaTabState("t2"));
    expect(state.pinnedItems.map(item => item.id)).toEqual(["good"]);
    expect(state.chartDates).toEqual({ kind: "window", dateWindow: FULL_WINDOW });
  });

  it("keeps a page filter only alongside a valid search", () => {
    const resultFilter = { ...createFdaResultFilter(), excludedRoutes: ["ORAL"] };
    saveRaw("valid", { type: "fda", searchParams: fdaSearch, resultFilter });
    saveRaw("invalid", { type: "fda", searchParams: { proprietaryName: 5 }, resultFilter });
    expect(loaded(persist.loadFdaTabState("valid")).resultFilter).toEqual(resultFilter);
    expect(loaded(persist.loadFdaTabState("invalid"))).toMatchObject({ searchParams: null, resultFilter: createFdaResultFilter() });

    saveRaw("nadac-invalid", { type: "nadac", searchParams: null, excludedNdcDescriptions: ["X"] });
    expect(loaded(persist.loadNadacTabState("nadac-invalid")).excludedNdcDescriptions).toEqual([]);
  });

  it("ignores state of another tab type or another version", () => {
    saveRaw("t3", { type: "nadac", searchParams: null });
    expect(persist.loadFdaTabState("t3")).toBeNull();
    localStorage.setItem(persist.tabKey("t4"), JSON.stringify({ version: persist.VERSION + 1, data: { type: "fda" } }));
    expect(persist.loadFdaTabState("t4")).toBeNull();
  });
});

describe("pruneStoredState", () => {
  it("deletes orphan tabs and other versions' keys, and nothing else", () => {
    const current = `drugpricing.v${persist.VERSION}`;
    const keys = [
      `${current}.workspace`,
      persist.tabKey("kept"),
      persist.tabKey("page-fda"),
      persist.tabKey("orphan"),
      "drugpricing.v0.workspace",
      // Shares the current prefix's first characters: must not pass for the current version.
      `${current}0.tab.kept`,
      "some-other-app.key",
    ];
    keys.forEach(key => localStorage.setItem(key, "{}"));

    persist.pruneStoredState(["kept"]);

    expect(Object.keys(localStorage).sort()).toEqual([
      `${current}.workspace`,
      persist.tabKey("kept"),
      persist.tabKey("page-fda"),
      "some-other-app.key",
    ].sort());
  });
});

describe("watchOtherWindows", () => {
  const storageEvent = (key: string | null, newValue: string | null) =>
    Object.assign(new Event("storage"), { storageArea: localStorage, key, newValue });

  const fdaTab = (searchParams: typeof fdaSearch | null) => ({
    type: "fda" as const, searchParams, resultFilter: createFdaResultFilter(), detailLevel: "product" as const,
    pinnedItems: [], chartDates: { kind: "window" as const, dateWindow: FULL_WINDOW }, matchScale: false,
  });

  it("ignores another window re-saving what this window wrote", () => {
    const onConflict = vi.fn();
    persist.watchOtherWindows(onConflict);
    persist.saveTabState("t1", fdaTab(null));
    window.dispatchEvent(storageEvent(persist.tabKey("t1"), localStorage.getItem(persist.tabKey("t1"))));
    expect(onConflict).not.toHaveBeenCalled();
  });

  it("ignores keys that aren't this version's", () => {
    const onConflict = vi.fn();
    persist.watchOtherWindows(onConflict);
    window.dispatchEvent(storageEvent("some-other-app.key", "x"));
    window.dispatchEvent(storageEvent("drugpricing.v0.workspace", "x"));
    expect(onConflict).not.toHaveBeenCalled();
  });

  it("stops writing and deleting after another window changes stored data", () => {
    const onConflict = vi.fn();
    persist.watchOtherWindows(onConflict);
    persist.saveTabState("t1", fdaTab(null));
    const before = localStorage.getItem(persist.tabKey("t1"));

    window.dispatchEvent(storageEvent(persist.tabKey("t2"), "written elsewhere"));
    window.dispatchEvent(storageEvent(persist.tabKey("t3"), "written elsewhere"));
    expect(onConflict).toHaveBeenCalledTimes(1);

    persist.saveTabState("t1", fdaTab(fdaSearch));
    persist.removeTabState("t1");
    expect(localStorage.getItem(persist.tabKey("t1"))).toBe(before);
  });
});
