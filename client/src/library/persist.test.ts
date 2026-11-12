import { beforeEach, describe, expect, it, vi } from "vitest";
import { FULL_WINDOW } from "./dates";
import { createFdaCriteria, createNadacCriteria } from "./searchCriteria";

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

const fdaCriteria = { ...createFdaCriteria(), proprietaryName: "eliquis" };
const nadacCriteria = { ...createNadacCriteria(), ndcDescription: "eliquis" };

// Search state as tabs saved it before search criteria existed.
const legacyFdaSearch = { proprietaryName: "eliquis", includeSamplePackages: true, includeResultsWNoPrices: false };
const legacyNadacSearch = { ndcDescription: "eliquis", ndc: "", minDate: "2025-10-07", maxDate: "2026-10-07" };

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
      criteria: {
        ...nadacCriteria, includeOtc: true, brandGeneric: "generic" as const,
        excludedNdcDescriptions: ["ELIQUIS 5 MG TABLET"], excludedUnits: ["each"],
      },
      pinnedItems: [
        {
          ...oldItem, dateWindow: { start: 100, end: null },
          changeSpan: { start: 1, end: 2, label: "-43.0%", direction: "drop" },
          series: [{ ...oldItem.series[0], color: "#56B4E9" }],
          matchScale: true,
        },
        { ...oldItem, id: "bar", chartType: "bar", dateWindow: FULL_WINDOW, barValue: "average" },
      ],
      chartDates: { kind: "recent" as const, months: 6 },
    } as Parameters<Persist["saveTabState"]>[1];
    persist.saveTabState("t1", state);
    expect(loaded(persist.loadNadacTabState("t1"))).toEqual(state);
  });

  it("shows charts saved before chart dates existed over all dates", () => {
    saveRaw("t1", { type: "fda", criteria: createFdaCriteria(), pinnedItems: [oldItem] });
    const state = loaded(persist.loadFdaTabState("t1"));
    expect(state.pinnedItems).toEqual([{ ...oldItem, dateWindow: FULL_WINDOW }]);
    expect(state.chartDates).toEqual({ kind: "window", dateWindow: FULL_WINDOW });
    expect(state.pinnedItems[0].matchScale).toBeUndefined();
  });

  it("drops only the malformed items and fields", () => {
    saveRaw("t2", {
      type: "fda", criteria: createFdaCriteria(),
      pinnedItems: [
        { ...oldItem, id: "bad-window", dateWindow: { start: "2025-01-01", end: null } },
        { ...oldItem, id: "bad-span", changeSpan: { start: 1 } },
        { ...oldItem, id: "bad-bar-value", chartType: "bar", barValue: "median" },
        { ...oldItem, id: "bad-color", series: [{ ...oldItem.series[0], color: 3 }] },
        { ...oldItem, id: "bad-match", matchScale: "yes" },
        { ...oldItem, id: "good" },
      ],
      chartDates: { kind: "recent", months: 0 },
    });
    const state = loaded(persist.loadFdaTabState("t2"));
    expect(state.pinnedItems.map(item => item.id)).toEqual(["good"]);
    expect(state.chartDates).toEqual({ kind: "window", dateWindow: FULL_WINDOW });
  });

  it("reads each criteria field on its own, falling back to its default", () => {
    saveRaw("t1", {
      type: "fda",
      criteria: { ...fdaCriteria, includeOtc: "yes", dates: { kind: "recent", months: 0 }, excludedRoutes: ["ORAL"], excludedLabelers: [3] },
    });
    expect(loaded(persist.loadFdaTabState("t1")).criteria).toEqual({ ...fdaCriteria, excludedRoutes: ["ORAL"] });

    saveRaw("t2", { type: "nadac", criteria: { ...nadacCriteria, brandGeneric: "branded", ndc: 5 } });
    expect(loaded(persist.loadNadacTabState("t2")).criteria).toEqual(nadacCriteria);
  });

  it("keeps exclusion lists only alongside a search", () => {
    saveRaw("fda", { type: "fda", criteria: { ...createFdaCriteria(), proprietaryName: "eli", excludedRoutes: ["ORAL"] } });
    expect(loaded(persist.loadFdaTabState("fda")).criteria.excludedRoutes).toEqual([]);

    saveRaw("nadac", { type: "nadac", criteria: { ...createNadacCriteria(), excludedNdcDescriptions: ["X"], includeOtc: true } });
    expect(loaded(persist.loadNadacTabState("nadac")).criteria).toMatchObject({ excludedNdcDescriptions: [], includeOtc: true });
  });

  it("reads tabs saved before search criteria into criteria, with OTC hidden", () => {
    saveRaw("fda", {
      type: "fda",
      searchParams: legacyFdaSearch,
      resultFilter: {
        excludedProductNdcs: ["1-1"], excludedDosageForms: ["TABLET"], excludedRoutes: [], excludedLabelers: ["L"],
        excludeOtc: false, excludeSamplePackages: false,
      },
      chartDates: { kind: "recent", months: 6 },
    });
    expect(loaded(persist.loadFdaTabState("fda")).criteria).toEqual({
      ...createFdaCriteria(),
      proprietaryName: "eliquis",
      dates: { kind: "recent", months: 6 },
      includeSamplePackages: true,
      excludedProductNdcs: ["1-1"], excludedDosageForms: ["TABLET"], excludedLabelers: ["L"],
    });

    saveRaw("nadac", { type: "nadac", searchParams: legacyNadacSearch, excludedNdcDescriptions: ["X"] });
    expect(loaded(persist.loadNadacTabState("nadac")).criteria).toEqual({
      ...createNadacCriteria(),
      ndcDescription: "eliquis",
      dates: { kind: "window", dateWindow: { start: Date.parse("2025-10-07"), end: Date.parse("2026-10-07") } },
      excludedNdcDescriptions: ["X"],
    });

    // A tab that never searched: defaults, and no stray filter.
    saveRaw("blank", { type: "nadac", searchParams: null, excludedNdcDescriptions: ["X"] });
    expect(loaded(persist.loadNadacTabState("blank")).criteria).toEqual(createNadacCriteria());
  });

  it("ignores state of another tab type or another version", () => {
    saveRaw("t3", { type: "nadac", criteria: createNadacCriteria() });
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

  const fdaTab = (criteria: typeof fdaCriteria) => ({
    type: "fda" as const, criteria, detailLevel: "product" as const,
    pinnedItems: [], chartDates: { kind: "window" as const, dateWindow: FULL_WINDOW },
  });

  it("ignores another window re-saving what this window wrote", () => {
    const onConflict = vi.fn();
    persist.watchOtherWindows(onConflict);
    persist.saveTabState("t1", fdaTab(createFdaCriteria()));
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
    persist.saveTabState("t1", fdaTab(createFdaCriteria()));
    const before = localStorage.getItem(persist.tabKey("t1"));

    window.dispatchEvent(storageEvent(persist.tabKey("t2"), "written elsewhere"));
    window.dispatchEvent(storageEvent(persist.tabKey("t3"), "written elsewhere"));
    expect(onConflict).toHaveBeenCalledTimes(1);

    persist.saveTabState("t1", fdaTab(fdaCriteria));
    persist.removeTabState("t1");
    expect(localStorage.getItem(persist.tabKey("t1"))).toBe(before);
  });

  it("follows another window's settings instead of going read-only", () => {
    const onConflict = vi.fn();
    const onSettings = vi.fn();
    persist.watchOtherWindows(onConflict);
    persist.watchSettings(onSettings);

    // What the other window's saveSettings would write.
    const settingsKey = `drugpricing.v${persist.VERSION}.settings`;
    const value = JSON.stringify({ version: persist.VERSION, data: { barStyle: "bar" } });
    localStorage.setItem(settingsKey, value);
    window.dispatchEvent(storageEvent(settingsKey, value));

    expect(onConflict).not.toHaveBeenCalled();
    expect(onSettings).toHaveBeenCalledWith({ barStyle: "bar", colorMode: "dark" });
    persist.saveTabState("t1", fdaTab(createFdaCriteria()));
    expect(localStorage.getItem(persist.tabKey("t1"))).not.toBeNull();
  });
});

describe("settings", () => {
  it("defaults when nothing or something unreadable is saved", () => {
    expect(persist.loadSettings()).toEqual({ barStyle: "dot", colorMode: "dark" });
    localStorage.setItem(`drugpricing.v${persist.VERSION}.settings`, JSON.stringify({ version: persist.VERSION, data: { barStyle: "pie", colorMode: "sepia" } }));
    expect(persist.loadSettings()).toEqual({ barStyle: "dot", colorMode: "dark" });
  });

  it("round-trips what saveSettings wrote", () => {
    persist.saveSettings({ barStyle: "bar", colorMode: "light" });
    expect(persist.loadSettings()).toEqual({ barStyle: "bar", colorMode: "light" });
  });

  it("survives pruning, which only removes tab state and old versions", () => {
    persist.saveSettings({ barStyle: "bar", colorMode: "light" });
    persist.pruneStoredState([]);
    expect(persist.loadSettings()).toEqual({ barStyle: "bar", colorMode: "light" });
  });
});
