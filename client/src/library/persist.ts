import type { SearchSource } from "./types";
import toast from "react-hot-toast";
import { DEFAULT_FDA_DETAIL_LEVEL, type FdaResultDetailLevel, type LayoutMode } from "./types";
import { type TabType, type WorkspaceTab } from "./tabType";
import type {
  BarValue, ChartChangeSpan, ChartItem, ChartSeriesSnapshot, ExplorerItem, PriceChangeListItem, SeriesKind,
} from "./explorerItems";
import { PRICE_CHANGE_SCAN_MIN_PERCENT } from "./constants";
import { FULL_WINDOW, fromDateInput, type ChartDates, type DateWindow } from "./dates";
import {
  createFdaCriteria, createNadacCriteria, isValidFdaSearch,
  type BrandGeneric, type FdaCriteria, type FdaExclusionKey, type NadacCriteria,
} from "./searchCriteria";
import { isValidNadacSearch } from "./nadacSearch";
import { isActivityCategory } from "./priceActivity";
import { readColumnOverrides, DEFAULT_SETTINGS, type AppSettings, type BarStyle, type ColorMode } from "./settings";

/*
 * Saves the workspace and each search tab's state to localStorage so they survive a reload.
 * Restored search tabs re-run their search (system items regenerate from fresh data); pinned
 * items come back from their stored snapshots.
 *
 * Everything here is best effort: storage can be unavailable (private windows, blocked site
 * data) or full. Reads fall back to defaults, writes report once and carry on. Every key and
 * payload carries VERSION; bump it when a stored shape changes incompatibly. Old data is then
 * ignored rather than misread, and keys under an old version's prefix are deleted on load.
 *
 * With the app open in several browser windows, each window holds its own copy in memory.
 * When another window changes a stored value, this window stops writing (see
 * `watchOtherWindows`) so it can't overwrite the newer data, and asks the user to reload.
 */

export const VERSION = 1;
const APP_PREFIX = "drugpricing.";
const PREFIX = `${APP_PREFIX}v${VERSION}`;
const WORKSPACE_KEY = `${PREFIX}.workspace`;
const SEARCH_PINS_KEY = `${PREFIX}.search-pins`;
const LAST_SEARCH_SOURCE_KEY = `${PREFIX}.last-search-source`;
const SETTINGS_KEY = `${PREFIX}.settings`;
const TAB_KEY_PREFIX = `${PREFIX}.tab.`;
export const tabKey = (tabId: string) => TAB_KEY_PREFIX + tabId;

/** Tab ids for the standalone /search/fda and /search/nadac pages, which are not workspace tabs. */
export const STANDALONE_TAB_IDS = { fda: "page-fda", nadac: "page-nadac" } as const;

/** How every stored value is wrapped. */
export type Envelope<T> = { version: number, data: T };

let warnedWriteFailure = false;

// What this window last wrote per key, to tell another window's writes from our own.
const lastWritten = new Map<string, string | null>();
// Set once another window has changed stored data: from then on this window only reads.
let readOnly = false;

function read<T>(key: string, isValid: (data: unknown) => data is T): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const envelope = JSON.parse(raw) as Envelope<unknown>;
    if (envelope?.version !== VERSION || !isValid(envelope.data)) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): boolean {
  if (readOnly) return false;
  try {
    const value = JSON.stringify({ version: VERSION, data } satisfies Envelope<T>);
    localStorage.setItem(key, value);
    lastWritten.set(key, value);
    return true;
  } catch (error) {
    console.warn("Could not save to localStorage:", error);
    if (!warnedWriteFailure) {
      warnedWriteFailure = true;
      toast.error("Couldn't save your workspace: browser storage is full or unavailable.");
    }
    return false;
  }
}

function remove(key: string): void {
  if (readOnly) return;
  try {
    localStorage.removeItem(key);
    lastWritten.set(key, null);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

// --- Validation -------------------------------------------------------------------------

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isString = (x: unknown): x is string => typeof x === "string";
const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every(isString);
const isBoolean = (x: unknown): x is boolean => typeof x === "boolean";
const oneOf = <T extends string>(values: readonly T[]) => (x: unknown): x is T => values.includes(x as T);

const isTabType = oneOf<TabType>(["fda", "nadac", "new", "collection"]);
const isLayoutMode = oneOf<LayoutMode>(["single", "split-2", "split-4"]);
const isDetailLevel = oneOf<FdaResultDetailLevel>(["product", "package"]);
const isSeriesKind = oneOf<SeriesKind>(["product", "package", "ndc"]);
const isSearchSource = oneOf<SearchSource>(["fda", "nadac"]);

const isWorkspaceTab = (x: unknown): x is WorkspaceTab =>
  isObject(x) && isString(x.id) && isString(x.title) && isTabType(x.type);

const isPricePoints = (x: unknown): x is Array<[number, number]> => Array.isArray(x)
  && x.every(p => Array.isArray(p) && p.length === 2 && p.every(v => typeof v === "number" && Number.isFinite(v)));

const isSeriesSnapshot = (x: unknown): x is ChartSeriesSnapshot =>
  isObject(x) && isString(x.ndc) && isString(x.label) && isString(x.unit)
  && (x.color === undefined || isString(x.color)) && isPricePoints(x.points)
  && (x.packageNdcs === undefined || (Array.isArray(x.packageNdcs)
    && x.packageNdcs.length === x.points.length
    && x.packageNdcs.every(ndc => ndc === null || (typeof ndc === "string" && ndc.length > 0))));

const isTimeOrNull = (x: unknown): x is number | null => x === null || typeof x === "number";

const isDateWindow = (x: unknown): x is DateWindow => isObject(x) && isTimeOrNull(x.start) && isTimeOrNull(x.end);

const isChartDates = (x: unknown): x is ChartDates =>
  isObject(x) && (
    (x.kind === "window" && isDateWindow(x.dateWindow))
    || (x.kind === "recent" && Number.isInteger(x.months) && (x.months as number) > 0));

const isChangeSpan = (x: unknown): x is ChartChangeSpan =>
  isObject(x) && typeof x.start === "number" && typeof x.end === "number" && isString(x.label)
  && (x.direction === undefined || x.direction === "rise" || x.direction === "drop")
  && (x.from === undefined || typeof x.from === "number") && (x.to === undefined || typeof x.to === "number");

const isBarValue = oneOf<BarValue>(["latest", "average"]);

/** Charts pinned before chart windows existed have no `dateWindow`; they show every date. */
type StoredExplorerItem = Omit<ChartItem, "dateWindow"> & { dateWindow?: DateWindow };

/** The fields every pinned item has, whatever its kind. */
const hasStoredItemBase = (x: Record<string, unknown>) =>
  isString(x.id) && isString(x.defaultTitle)
  && (x.title === undefined || isString(x.title)) && typeof x.createdAt === "number"
  && isObject(x.layout) && (x.layout.width === "half" || x.layout.width === "full")
  && typeof x.collapsed === "boolean"
  && isObject(x.source) && isString(x.source.searchLabel) && isSeriesKind(x.source.seriesKind)
  && typeof x.source.seriesCount === "number" && typeof x.source.resultSeriesCount === "number"
  && typeof x.source.filtered === "boolean";

const isStoredExplorerItem = (x: unknown): x is StoredExplorerItem =>
  isObject(x) && x.kind === "chart" && hasStoredItemBase(x) && (x.chartType === "line" || x.chartType === "bar")
  && Array.isArray(x.series) && x.series.every(isSeriesSnapshot)
  && (x.dateWindow === undefined || isDateWindow(x.dateWindow))
  && (x.changeSpan === undefined || isChangeSpan(x.changeSpan))
  && (x.barValue === undefined || isBarValue(x.barValue))
  && (x.matchScale === undefined || typeof x.matchScale === "boolean")
  && (x.showPriceChanges === undefined || typeof x.showPriceChanges === "boolean")
  && (x.eventDate === undefined || Number.isFinite(x.eventDate));

/** A scan's percent as the scan field accepts it: at least the minimum, one decimal at most. */
const isThresholdPercent = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x)
  && x >= PRICE_CHANGE_SCAN_MIN_PERCENT && Number(x.toFixed(1)) === x;

/** Lists always stored their dates and at least one package's history; one without either is invalid. */
const isStoredPriceChangeList = (x: unknown): x is PriceChangeListItem =>
  isObject(x) && x.kind === "price-change-list" && hasStoredItemBase(x)
  && isThresholdPercent(x.thresholdPercent) && isDateWindow(x.dateWindow)
  && Array.isArray(x.histories) && x.histories.length > 0 && x.histories.every(isSeriesSnapshot);

/** Keeps the items that are well formed; one bad item does not cost the user the rest. */
const validItems = (x: unknown): ExplorerItem[] => Array.isArray(x)
  ? x.filter((item): item is StoredExplorerItem | PriceChangeListItem =>
    isStoredExplorerItem(item) || isStoredPriceChangeList(item)).map((item): ExplorerItem => {
    // This field was added after pins existed. Drop only an invalid value; keep the pin and every
    // other field, and leave a missing value unknown rather than inferring it from other state.
    const { searchSource, ...metadata } = item.source;
    const source = { ...metadata, ...(isSearchSource(searchSource) && { searchSource }) };
    return item.kind === "chart"
      ? { ...item, source, dateWindow: item.dateWindow ?? FULL_WINDOW }
      : { ...item, source };
  })
  : [];

const isBrandGeneric = oneOf<BrandGeneric>(["all", "brand", "generic"]);

/** Reads one field of `raw` when it passes `isValid`, else the field's default. */
const field = <T>(raw: Record<string, unknown>, defaults: T) =>
  <K extends keyof T>(key: K, isValid: (x: unknown) => boolean): T[K] =>
    isValid(raw[key as string]) ? raw[key as string] as T[K] : defaults[key];

/*
 * Criteria are read field by field. Exclusion lists name values from a result, so they are kept
 * only alongside a search (`hasSearch`): on their own they filter nothing meaningful.
 */

function readNadacCriteria(raw: Record<string, unknown>): NadacCriteria {
  const defaults = createNadacCriteria();
  const get = field(raw, defaults);
  const terms = { ndcDescription: get("ndcDescription", isString), ndc: get("ndc", isString) };
  const hasSearch = isValidNadacSearch(terms.ndcDescription, terms.ndc);
  return {
    ...terms,
    dates: get("dates", isChartDates),
    includeOtc: get("includeOtc", isBoolean),
    brandGeneric: get("brandGeneric", isBrandGeneric),
    excludedNdcDescriptions: hasSearch ? get("excludedNdcDescriptions", isStringArray) : [],
    excludedUnits: hasSearch ? get("excludedUnits", isStringArray) : [],
  };
}

function readFdaCriteria(raw: Record<string, unknown>): FdaCriteria {
  const defaults = createFdaCriteria();
  const get = field(raw, defaults);
  const proprietaryName = get("proprietaryName", isString);
  const nonProprietaryName = get("nonProprietaryName", isString);
  const hasSearch = isValidFdaSearch(proprietaryName, nonProprietaryName);
  const exclusions = (key: FdaExclusionKey) => hasSearch ? get(key, isStringArray) : [];
  return {
    proprietaryName,
    nonProprietaryName,
    dates: get("dates", isChartDates),
    includeOtc: get("includeOtc", isBoolean),
    includeSamplePackages: get("includeSamplePackages", isBoolean),
    includeResultsWithoutPrices: get("includeResultsWithoutPrices", isBoolean),
    // A fixed refine field, kept without a search like the Include boxes; unknown values are dropped.
    excludedActivities: Array.isArray(raw.excludedActivities) ? raw.excludedActivities.filter(isActivityCategory) : [],
    excludedProductNdcs: exclusions("excludedProductNdcs"),
    excludedDosageForms: exclusions("excludedDosageForms"),
    excludedStrengths: exclusions("excludedStrengths"),
    excludedRoutes: exclusions("excludedRoutes"),
    excludedLabelers: exclusions("excludedLabelers"),
    excludedUnits: exclusions("excludedUnits"),
  };
}

/*
 * Tabs saved before search criteria existed (2026-11) stored `searchParams` plus a page filter,
 * and the page's `chartDates`. They are read into criteria here rather than bumping VERSION, so
 * nobody loses tabs. Remove these at the next real VERSION bump. Include OTC starts unchecked on
 * them, as on a new search.
 */

function legacyNadacCriteria(raw: Record<string, unknown>): NadacCriteria {
  const params = isObject(raw.searchParams) ? raw.searchParams : {};
  const dates: ChartDates | undefined = isString(params.minDate) && isString(params.maxDate)
    ? { kind: "window", dateWindow: { start: fromDateInput(params.minDate), end: fromDateInput(params.maxDate) } }
    : undefined;
  return readNadacCriteria({
    ndcDescription: params.ndcDescription,
    ndc: params.ndc,
    dates,
    excludedNdcDescriptions: raw.excludedNdcDescriptions,
  });
}

function legacyFdaCriteria(raw: Record<string, unknown>): FdaCriteria {
  const params = isObject(raw.searchParams) ? raw.searchParams : {};
  const filter = isObject(raw.resultFilter) ? raw.resultFilter : {};
  return readFdaCriteria({
    proprietaryName: params.proprietaryName,
    nonProprietaryName: params.nonProprietaryName,
    // FDA searches loaded all history, and the page's chart dates picked what showed.
    dates: raw.chartDates,
    includeSamplePackages: params.includeSamplePackages,
    includeResultsWithoutPrices: params.includeResultsWNoPrices,
    excludedProductNdcs: filter.excludedProductNdcs,
    excludedDosageForms: filter.excludedDosageForms,
    excludedRoutes: filter.excludedRoutes,
    excludedLabelers: filter.excludedLabelers,
  });
}

// --- Workspace ----------------------------------------------------------------------------

export type PersistedWorkspace = {
  tabs: WorkspaceTab[],
  layoutMode: LayoutMode,
  paneAssignment: Array<string | null>,
};

const isPersistedWorkspace = (x: unknown): x is PersistedWorkspace =>
  isObject(x) && Array.isArray(x.tabs) && x.tabs.length > 0 && x.tabs.every(isWorkspaceTab)
  && isLayoutMode(x.layoutMode)
  && Array.isArray(x.paneAssignment) && x.paneAssignment.every(p => p === null || isString(p));

export function loadWorkspace(): PersistedWorkspace | null {
  const workspace = read(WORKSPACE_KEY, isPersistedWorkspace);
  if (!workspace) return null;

  // Panes may only show tabs that exist.
  const tabIds = new Set(workspace.tabs.map(tab => tab.id));
  const paneAssignment: Array<string | null> = workspace.paneAssignment
    .map(id => id !== null && tabIds.has(id) ? id : null);
  if (!paneAssignment.some(id => id !== null)) paneAssignment[0] = workspace.tabs[0].id;

  return { ...workspace, paneAssignment };
}

export function saveWorkspace(workspace: PersistedWorkspace): void {
  write(WORKSPACE_KEY, workspace);
}

/**
 * Deletes stored data that can never be read again: state for tabs that are not in the
 * workspace, and anything stored under an older VERSION's prefix.
 */
export function pruneStoredState(keepTabIds: string[]): void {
  const keep = new Set([...keepTabIds, ...Object.values(STANDALONE_TAB_IDS)].map(tabKey));
  try {
    const stale = Object.keys(localStorage).filter(key =>
      key.startsWith(APP_PREFIX)
      && (!key.startsWith(PREFIX + ".") || (key.startsWith(TAB_KEY_PREFIX) && !keep.has(key))));
    stale.forEach(remove);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

/**
 * Calls `onConflict` (once) when another browser window changes this app's stored data, and
 * stops this window's writes from then on: its in-memory state is now older than storage, and
 * saving it would overwrite the other window's changes. A window that only re-saves what is
 * already stored (e.g. a second window opening) is not a conflict.
 *
 * @returns a function that stops watching
 */
export function watchOtherWindows(onConflict: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (readOnly || event.storageArea !== localStorage) return;
    if (event.key !== null && !event.key.startsWith(PREFIX + ".")) return;
    // Settings and the last navigation source can be shared without endangering tab state.
    if (event.key === SETTINGS_KEY || event.key === LAST_SEARCH_SOURCE_KEY) return;
    if (event.key !== null && lastWritten.has(event.key) && lastWritten.get(event.key) === event.newValue) return;
    readOnly = true;
    onConflict();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export type { SearchSource } from "./types";

export function loadLastSearchSource(): SearchSource | null {
  return read(LAST_SEARCH_SOURCE_KEY, isSearchSource);
}

export function saveLastSearchSource(source: SearchSource): void {
  write(LAST_SEARCH_SOURCE_KEY, source);
}

// --- Settings ------------------------------------------------------------------------------

const isBarStyle = oneOf<BarStyle>(["dot", "bar"]);
const isColorMode = oneOf<ColorMode>(["dark", "light"]);

/** The app-wide settings, field by field, each falling back to its default. */
export function loadSettings(): AppSettings {
  const raw = read(SETTINGS_KEY, isObject);
  return {
    barStyle: raw && isBarStyle(raw.barStyle) ? raw.barStyle : DEFAULT_SETTINGS.barStyle,
    colorMode: raw && isColorMode(raw.colorMode) ? raw.colorMode : DEFAULT_SETTINGS.colorMode,
    autoPinCharts: raw && typeof raw.autoPinCharts === "boolean" ? raw.autoPinCharts : DEFAULT_SETTINGS.autoPinCharts,
    columnOverrides: readColumnOverrides(raw && raw.columnOverrides),
  };
}

export function saveSettings(settings: AppSettings): void {
  write(SETTINGS_KEY, settings);
}

/**
 * Calls `onChange` with the new settings when another window saves them. Unlike tab state,
 * settings are one small value every window can simply follow, so a change never makes this
 * window read-only.
 */
export function watchSettings(onChange: (settings: AppSettings) => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage || event.key !== SETTINGS_KEY) return;
    onChange(loadSettings());
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

// --- Search tabs --------------------------------------------------------------------------

/**
 * What every tab type with pinned items saves from `PinnedItemsProvider`. Tabs saved before
 * search criteria existed also hold the page's `chartDates`, which the search's Dates replaced;
 * it is ignored, except that `legacyFdaCriteria` reads it.
 */
export type PersistedExplorerState = {
  pinnedItems: ExplorerItem[],
};

export type PersistedFdaTab = {
  type: "fda",
  /** The applied criteria. A tab has a search when its terms are enough to search on. */
  criteria: FdaCriteria,
  detailLevel: FdaResultDetailLevel,
} & PersistedExplorerState;

export type PersistedNadacTab = {
  type: "nadac",
  /** The applied criteria. A tab has a search when its terms are enough to search on. */
  criteria: NadacCriteria,
} & PersistedExplorerState;

export type PersistedCollectionTab = {
  type: "collection"
} & PersistedExplorerState;

export type PersistedSearchTab = PersistedFdaTab | PersistedNadacTab;

export const isStorageReadOnly = () => readOnly;

type PersistedTab = PersistedFdaTab | PersistedNadacTab | PersistedCollectionTab;

/*
 * Tab state is validated field by field, each with its own default, so one bad field never
 * costs the user the tab's pinned items.
 */

function loadExplorerState(raw: Record<string, unknown>): PersistedExplorerState {
  return {
    pinnedItems: validItems(raw.pinnedItems),
  };
}

function readTab(tabId: string, type: PersistedTab["type"]): Record<string, unknown> | null {
  const raw = read(tabKey(tabId), isObject);
  return raw && raw.type === type ? raw : null;
}

export function loadFdaTabState(tabId: string): PersistedFdaTab | null {
  const raw = readTab(tabId, "fda");
  if (!raw) return null;
  return {
    type: "fda",
    criteria: isObject(raw.criteria) ? readFdaCriteria(raw.criteria) : legacyFdaCriteria(raw),
    detailLevel: isDetailLevel(raw.detailLevel) ? raw.detailLevel : DEFAULT_FDA_DETAIL_LEVEL,
    ...loadExplorerState(raw),
  };
}

export function loadNadacTabState(tabId: string): PersistedNadacTab | null {
  const raw = readTab(tabId, "nadac");
  if (!raw) return null;
  return {
    type: "nadac",
    criteria: isObject(raw.criteria) ? readNadacCriteria(raw.criteria) : legacyNadacCriteria(raw),
    ...loadExplorerState(raw),
  };
}

export function loadCollectionTabState(tabId: string): PersistedCollectionTab | null {
  const raw = readTab(tabId, "collection");
  if (!raw) return null;
  return {
    type: "collection",
    ...loadExplorerState(raw),
  };
}

export function saveTabState(tabId: string, state: PersistedTab): boolean {
  return write(tabKey(tabId), state);
}

export function removeTabState(tabId: string): void {
  remove(tabKey(tabId));
}

/** Standalone searches share pins; workspace tabs continue to own theirs individually. */
export function loadSearchPins(): PersistedExplorerState {
  const shared = read(SEARCH_PINS_KEY, isObject);
  if (shared && Array.isArray(shared.pinnedItems)) return loadExplorerState(shared);
  const legacy = [loadFdaTabState(STANDALONE_TAB_IDS.fda), loadNadacTabState(STANDALONE_TAB_IDS.nadac)]
    .flatMap(state => state?.pinnedItems ?? []);
  return { pinnedItems: [...new Map(legacy.map(item => [item.id, item])).values()] };
}

const clearedLegacyPinTabs = new Set<string>();

export function saveSearchPins(pinnedItems: ExplorerItem[]): void {
  // Never erase the legacy copies until the shared snapshots have been saved successfully.
  if (!write(SEARCH_PINS_KEY, { pinnedItems })) return;
  for (const tabId of Object.values(STANDALONE_TAB_IDS)) {
    if (clearedLegacyPinTabs.has(tabId)) continue;
    const raw = read(tabKey(tabId), isObject);
    if (raw && Array.isArray(raw.pinnedItems) && raw.pinnedItems.length > 0 &&
      !write(tabKey(tabId), { ...raw, pinnedItems: [] })) continue;
    clearedLegacyPinTabs.add(tabId);
  }
}

/** Save criteria without copying the shared pins back into a source's legacy storage slot. */
export function saveStandaloneSearch(state: Omit<PersistedFdaTab, "pinnedItems"> | Omit<PersistedNadacTab, "pinnedItems">): void {
  const tabId = STANDALONE_TAB_IDS[state.type];
  const raw = read(tabKey(tabId), isObject);
  // Preserve any unmigrated snapshots if the shared save failed (e.g. browser storage is full).
  write(tabKey(tabId), { ...state, pinnedItems: validItems(raw?.pinnedItems) });
}
