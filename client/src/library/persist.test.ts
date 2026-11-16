import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COLUMN_OVERRIDES, columnVisibilityModel, columnOverridesFromModel, RESULT_SELECTION_FIELD } from "./settings";
import { FULL_WINDOW } from "./dates";
import { DEFAULT_FDA_DETAIL_LEVEL } from "./types";
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
  it("reports a failed initial tab save so callers can avoid opening an empty search", async () => {
    const toast = (await import("react-hot-toast")).default;
    const error = vi.spyOn(toast, "error").mockImplementation(() => "toast");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("Full"); } });
    expect(persist.saveTabState("copy", { type: "fda", criteria: fdaCriteria,
      detailLevel: "package", pinnedItems: [] })).toBe(false);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
    warn.mockRestore();
  });

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
          series: [{ ...oldItem.series[0], color: "#56B4E9", packageNdcs: ["PKG1"] }],
          showPriceChanges: false,
          matchScale: true,
        },
        { ...oldItem, id: "partial-package-identities", dateWindow: FULL_WINDOW, series: [{
          ...oldItem.series[0], points: [[1, 2], [2, 3]], packageNdcs: ["PKG1", null],
        }] },
        { ...oldItem, id: "bar", chartType: "bar", dateWindow: FULL_WINDOW, barValue: "average" },
        // From "Chart this change": the full shown dates, with the change marked.
        { ...oldItem, id: "event", dateWindow: { start: 0, end: 500 }, eventDate: 300 },
      ],
    } as Parameters<Persist["saveTabState"]>[1];
    persist.saveTabState("t1", state);
    expect(loaded(persist.loadNadacTabState("t1"))).toEqual(state);
  });

  it("shows charts saved before chart dates existed over all dates", () => {
    saveRaw("t1", { type: "fda", criteria: createFdaCriteria(), pinnedItems: [oldItem] });
    const state = loaded(persist.loadFdaTabState("t1"));
    expect(state.pinnedItems).toEqual([{ ...oldItem, dateWindow: FULL_WINDOW }]);
    expect(state.pinnedItems[0].matchScale).toBeUndefined();
  });

  it("round-trips partial package identities without discarding the pin", () => {
    const partialPin = {
      ...oldItem,
      series: [{ ...oldItem.series[0], points: [[1, 2], [2, 3]], packageNdcs: ["PKG1", null] }],
    } as Parameters<Persist["saveTabState"]>[1]["pinnedItems"][number];
    persist.saveTabState("partial", { type: "fda", criteria: createFdaCriteria(), detailLevel: "package", pinnedItems: [partialPin] });
    const restored = loaded(persist.loadFdaTabState("partial")).pinnedItems[0];
    expect(restored.series[0].packageNdcs).toEqual(["PKG1", null]);
  });

  it("restores explicit search sources and drops only an invalid source field", () => {
    saveRaw("search-source", {
      type: "fda", criteria: createFdaCriteria(), detailLevel: "package",
      pinnedItems: [
        { ...oldItem, id: "known", source: { ...oldItem.source, searchSource: "fda" } },
        { ...oldItem, id: "unknown", source: { ...oldItem.source, searchSource: "legacy-fda" } },
        { ...oldItem, id: "missing" },
      ],
    });
    const items = loaded(persist.loadFdaTabState("search-source")).pinnedItems;
    expect(items.map(item => item.id)).toEqual(["known", "unknown", "missing"]);
    expect(items[0].source.searchSource).toBe("fda");
    expect(items[1].source.searchSource).toBeUndefined();
    expect(items[1].source.searchLabel).toBe("humira");
    expect(items[2].source.searchSource).toBeUndefined();
  });

  it("defaults a missing or invalid detail level to packages and keeps a saved one", () => {
    saveRaw("t1", { type: "fda", criteria: createFdaCriteria(), pinnedItems: [] });
    saveRaw("t2", { type: "fda", criteria: createFdaCriteria(), detailLevel: "bogus", pinnedItems: [] });
    saveRaw("t3", { type: "fda", criteria: createFdaCriteria(), detailLevel: "product", pinnedItems: [] });
    persist.saveTabState("t4", { type: "fda", criteria: createFdaCriteria(), detailLevel: "product", pinnedItems: [] });
    expect(DEFAULT_FDA_DETAIL_LEVEL).toBe("package");
    expect(loaded(persist.loadFdaTabState("t1")).detailLevel).toBe("package");
    expect(loaded(persist.loadFdaTabState("t2")).detailLevel).toBe("package");
    expect(loaded(persist.loadFdaTabState("t3")).detailLevel).toBe("product");
    expect(loaded(persist.loadFdaTabState("t4")).detailLevel).toBe("product");
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
        { ...oldItem, id: "bad-events", showPriceChanges: "yes" },
        { ...oldItem, id: "bad-event-date", eventDate: "2026-01-14" },
        { ...oldItem, id: "bad-package-points", series: [{ ...oldItem.series[0], packageNdcs: [] }] },
        { ...oldItem, id: "good" },
      ],
    });
    const state = loaded(persist.loadFdaTabState("t2"));
    expect(state.pinnedItems.map(item => item.id)).toEqual(["good"]);
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

  it("restores generic-only searches and their exclusions", () => {
    const criteria = { ...createFdaCriteria(), nonProprietaryName: "atorvastatin", excludedRoutes: ["ORAL"] };
    saveRaw("generic", { type: "fda", criteria });
    expect(loaded(persist.loadFdaTabState("generic")).criteria).toEqual(criteria);
  });

  it("defaults a missing or malformed generic name without losing an older brand search", () => {
    for (const value of [undefined, 42]) {
      saveRaw("brand", { type: "fda", criteria: { ...fdaCriteria, nonProprietaryName: value, excludedRoutes: ["ORAL"] } });
      expect(loaded(persist.loadFdaTabState("brand")).criteria).toEqual({ ...fdaCriteria, excludedRoutes: ["ORAL"] });
    }
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

const storageEvent = (key: string | null, newValue: string | null) =>
  Object.assign(new Event("storage"), { storageArea: localStorage, key, newValue });

describe("watchOtherWindows", () => {
  const fdaTab = (criteria: typeof fdaCriteria) => ({
    type: "fda" as const, criteria, detailLevel: "product" as const,
    pinnedItems: [],
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

    expect(persist.isStorageReadOnly()).toBe(true);
    expect(persist.saveTabState("t1", fdaTab(fdaCriteria))).toBe(false);
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
    expect(onSettings).toHaveBeenCalledWith({ barStyle: "bar", colorMode: "dark", columnOverrides: DEFAULT_COLUMN_OVERRIDES });
    persist.saveTabState("t1", fdaTab(createFdaCriteria()));
    expect(localStorage.getItem(persist.tabKey("t1"))).not.toBeNull();
  });
});

describe("settings", () => {
  it("defaults when nothing or something unreadable is saved", () => {
    expect(persist.loadSettings()).toEqual({ barStyle: "dot", colorMode: "dark", columnOverrides: DEFAULT_COLUMN_OVERRIDES });
    localStorage.setItem(`drugpricing.v${persist.VERSION}.settings`, JSON.stringify({ version: persist.VERSION, data: { barStyle: "pie", colorMode: "sepia" } }));
    expect(persist.loadSettings()).toEqual({ barStyle: "dot", colorMode: "dark", columnOverrides: DEFAULT_COLUMN_OVERRIDES });
  });

  it("round-trips what saveSettings wrote", () => {
    persist.saveSettings({ barStyle: "bar", colorMode: "light", columnOverrides: DEFAULT_COLUMN_OVERRIDES });
    expect(persist.loadSettings()).toEqual({ barStyle: "bar", colorMode: "light", columnOverrides: DEFAULT_COLUMN_OVERRIDES });
  });

  it("round-trips independent column choices and follows another window", () => {
    const columnOverrides = { fdaProduct: { proprietaryName: false }, fdaPackage: {}, nadac: { ndcDescription: false, minPrice: true } };
    const settings = { barStyle: "dot" as const, colorMode: "light" as const, columnOverrides };
    const onSettings = vi.fn();
    const onConflict = vi.fn();
    persist.watchSettings(onSettings);
    persist.watchOtherWindows(onConflict);
    const key = `drugpricing.v${persist.VERSION}.settings`;
    const value = JSON.stringify({ version: persist.VERSION, data: settings });
    localStorage.setItem(key, value);
    window.dispatchEvent(storageEvent(key, value));
    expect(onSettings).toHaveBeenCalledWith(settings);
    expect(onConflict).not.toHaveBeenCalled();
    persist.saveSettings(settings);
    persist.pruneStoredState([]);
    expect(persist.loadSettings()).toEqual(settings);
  });

  it("validates column overrides independently without discarding valid settings", () => {
    const key = `drugpricing.v${persist.VERSION}.settings`;
    localStorage.setItem(key, JSON.stringify({ version: persist.VERSION, data: {
      colorMode: "light", columnOverrides: { fdaProduct: { latestPrice: false, minPrice: true, maxPrice: 42, routeName: null, [RESULT_SELECTION_FIELD]: false }, fdaPackage: "bad", nadac: [] },
    } }));
    expect(persist.loadSettings()).toEqual({ barStyle: "dot", colorMode: "light", columnOverrides: {
      fdaProduct: { latestPrice: false, minPrice: true }, fdaPackage: {}, nadac: {},
    } });
  });

  it("keeps an untouched browser on current column defaults across saves", () => {
    // Match SettingsProvider's initial load and automatic mount-time save.
    persist.saveSettings(persist.loadSettings());
    const before = columnVisibilityModel(["minPrice", "maxPrice"], persist.loadSettings().columnOverrides.nadac);
    expect(before).toEqual({ minPrice: false, maxPrice: false });
    // A later release shows Min Price by default and hides Description instead.
    const after = columnVisibilityModel(["maxPrice", "ndcDescription"], persist.loadSettings().columnOverrides.nadac);
    expect(after.minPrice).toBeUndefined();
    expect(after.ndcDescription).toBe(false);
    expect(persist.loadSettings().columnOverrides).toEqual(DEFAULT_COLUMN_OVERRIDES);
  });

  it("keeps new optional columns hidden after custom choices were saved", () => {
    const defaults = ["minPrice", "maxPrice"];
    const settings = persist.loadSettings();
    settings.columnOverrides.nadac = columnOverridesFromModel(defaults, { minPrice: true, maxPrice: false, ndcDescription: false });
    persist.saveSettings(settings);
    const saved = persist.loadSettings().columnOverrides.nadac;
    expect(saved).toEqual({ minPrice: true, ndcDescription: false });
    const model = columnVisibilityModel([...defaults, "newOptionalColumn"], saved);
    expect(model.newOptionalColumn).toBe(false);
    expect(model.minPrice).toBe(true);
    expect(model.ndcDescription).toBe(false);
    // A new default-visible column remains visible (absent means visible to MUI).
    expect(model.priceActivity).toBeUndefined();
    // Reset clears choices, so all columns follow the current defaults again.
    persist.saveSettings({ ...settings, columnOverrides: { ...settings.columnOverrides, nadac: {} } });
    expect(columnVisibilityModel(defaults, persist.loadSettings().columnOverrides.nadac))
      .toEqual({ minPrice: false, maxPrice: false });
  });

  it("survives pruning, which only removes tab state and old versions", () => {
    persist.saveSettings({ barStyle: "bar", colorMode: "light", columnOverrides: DEFAULT_COLUMN_OVERRIDES });
    persist.pruneStoredState([]);
    expect(persist.loadSettings()).toEqual({ barStyle: "bar", colorMode: "light", columnOverrides: DEFAULT_COLUMN_OVERRIDES });
  });
});

describe("last search source", () => {
  const key = "drugpricing.v1.last-search-source";

  it("starts without a source and retains either source through pruning", () => {
    expect(persist.loadLastSearchSource()).toBeNull();
    for (const source of ["fda", "nadac"] as const) {
      persist.saveLastSearchSource(source);
      persist.pruneStoredState([]);
      expect(persist.loadLastSearchSource()).toBe(source);
    }
  });

  it.each([
    "not JSON",
    JSON.stringify({ version: 0, data: "fda" }),
    JSON.stringify({ version: 1, data: "other" }),
    JSON.stringify({ version: 1, data: {} }),
  ])("ignores invalid stored sources: %s", raw => {
    localStorage.setItem(key, raw);
    expect(persist.loadLastSearchSource()).toBeNull();
  });

  it("allows another window to remember a source without making workspace writes read-only", () => {
    const onConflict = vi.fn();
    persist.watchOtherWindows(onConflict);
    const value = JSON.stringify({ version: persist.VERSION, data: "nadac" });
    localStorage.setItem(key, value);
    window.dispatchEvent(Object.assign(new Event("storage"), { storageArea: localStorage, key, newValue: value }));
    expect(onConflict).not.toHaveBeenCalled();
    expect(persist.loadLastSearchSource()).toBe("nadac");
    persist.saveTabState("t1", { type: "nadac", criteria: nadacCriteria, pinnedItems: [] });
    expect(persist.loadNadacTabState("t1")).not.toBeNull();
  });
});

describe("standalone search pins", () => {
  const seed = () => {
    saveRaw(persist.STANDALONE_TAB_IDS.fda, { type: "fda", criteria: fdaCriteria, detailLevel: "package", pinnedItems: [oldItem] });
    saveRaw(persist.STANDALONE_TAB_IDS.nadac, { type: "nadac", criteria: nadacCriteria, pinnedItems: [{ ...oldItem, id: "nadac-pin" }] });
    saveRaw("workspace-fda", { type: "fda", criteria: fdaCriteria, pinnedItems: [{ ...oldItem, id: "workspace-pin" }] });
  };

  it("merges both legacy sources, preserves criteria, and leaves workspace pins independent", () => {
    seed();
    const pins = persist.loadSearchPins().pinnedItems;
    expect(pins.map(pin => pin.id)).toEqual(["i1", "nadac-pin"]);
    persist.saveSearchPins(pins);
    persist.pruneStoredState(["workspace-fda"]);
    expect(persist.loadSearchPins().pinnedItems).toEqual(pins);
    expect(persist.loadFdaTabState(persist.STANDALONE_TAB_IDS.fda)).toMatchObject({
      criteria: fdaCriteria, detailLevel: "package", pinnedItems: [],
    });
    expect(persist.loadNadacTabState(persist.STANDALONE_TAB_IDS.nadac)).toMatchObject({ criteria: nadacCriteria, pinnedItems: [] });
    expect(persist.loadFdaTabState("workspace-fda")?.pinnedItems.map(pin => pin.id)).toEqual(["workspace-pin"]);
  });

  it("keeps an intentionally empty collection empty and never copies shared pins into source state", () => {
    seed();
    persist.saveSearchPins(persist.loadSearchPins().pinnedItems);
    persist.saveSearchPins([]);
    persist.saveStandaloneSearch({ type: "fda", criteria: { ...fdaCriteria, proprietaryName: "humira" }, detailLevel: "product" });
    expect(persist.loadSearchPins().pinnedItems).toEqual([]);
    expect(persist.loadFdaTabState(persist.STANDALONE_TAB_IDS.fda)?.pinnedItems).toEqual([]);
  });

  it("validates shared pins individually and deduplicates legacy ids", () => {
    seed();
    saveRaw(persist.STANDALONE_TAB_IDS.nadac, { type: "nadac", criteria: nadacCriteria, pinnedItems: [oldItem] });
    expect(persist.loadSearchPins().pinnedItems.map(pin => pin.id)).toEqual(["i1"]);
    localStorage.setItem("drugpricing.v1.search-pins", JSON.stringify({ version: 1, data: { pinnedItems: [null, oldItem, { kind: "chart" }] } }));
    expect(persist.loadSearchPins().pinnedItems.map(pin => pin.id)).toEqual(["i1"]);
  });

  it("preserves both legacy collections when saving shared snapshots fails", async () => {
    seed();
    const storage = localStorage;
    const getItem = storage.getItem.bind(storage);
    const before = Object.values(persist.STANDALONE_TAB_IDS).map(id => getItem(persist.tabKey(id)));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const toast = (await import("react-hot-toast")).default;
    const error = vi.spyOn(toast, "error").mockReturnValue("storage-error");
    vi.stubGlobal("localStorage", { getItem, setItem: (key: string, value: string) => {
      if (key.endsWith(".search-pins")) throw new Error("quota");
      storage.setItem(key, value);
    } });
    persist.saveSearchPins(persist.loadSearchPins().pinnedItems);
    expect(Object.values(persist.STANDALONE_TAB_IDS).map(id => getItem(persist.tabKey(id)))).toEqual(before);
    persist.saveStandaloneSearch({ type: "fda", criteria: { ...fdaCriteria, proprietaryName: "humira" }, detailLevel: "product" });
    expect(persist.loadFdaTabState(persist.STANDALONE_TAB_IDS.fda)?.pinnedItems.map(pin => pin.id)).toEqual(["i1"]);
    expect(error).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    error.mockRestore();
  });
});
