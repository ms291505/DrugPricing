import toast from "react-hot-toast";
import {
  createFdaResultFilter,
  type AdvancedFdaSearchParams, type FdaResultDetailLevel, type FdaResultFilter, type LayoutMode,
  type NadacSearchParams,
} from "./types";
import { type TabType, type WorkspaceTab } from "./tabType";
import type { ChartChangeSpan, ChartItem, ChartSeriesSnapshot, ExplorerItem, SeriesKind } from "./explorerItems";
import { ALL_DATES, FULL_WINDOW, type ChartDates, type DateWindow } from "./dates";
import type { BarValue } from "./seriesSummary";
import { DEFAULT_SETTINGS, type AppSettings, type BarStyle } from "./settings";

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
const SETTINGS_KEY = `${PREFIX}.settings`;
const TAB_KEY_PREFIX = `${PREFIX}.tab.`;
export const tabKey = (tabId: string) => TAB_KEY_PREFIX + tabId;

/** Tab ids for the standalone /fda-search and /nadac-search pages, which are not workspace tabs. */
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

function write<T>(key: string, data: T): void {
  if (readOnly) return;
  try {
    const value = JSON.stringify({ version: VERSION, data } satisfies Envelope<T>);
    localStorage.setItem(key, value);
    lastWritten.set(key, value);
  } catch (error) {
    console.warn("Could not save to localStorage:", error);
    if (!warnedWriteFailure) {
      warnedWriteFailure = true;
      toast.error("Couldn't save your workspace: browser storage is full or unavailable.");
    }
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
const oneOf = <T extends string>(values: readonly T[]) => (x: unknown): x is T => values.includes(x as T);

const isTabType = oneOf<TabType>(["fda", "nadac", "new", "collection"]);
const isLayoutMode = oneOf<LayoutMode>(["single", "split-2", "split-4"]);
const isDetailLevel = oneOf<FdaResultDetailLevel>(["product", "package"]);
const isSeriesKind = oneOf<SeriesKind>(["product", "package", "ndc"]);

const isWorkspaceTab = (x: unknown): x is WorkspaceTab =>
  isObject(x) && isString(x.id) && isString(x.title) && isTabType(x.type);

const isSeriesSnapshot = (x: unknown): x is ChartSeriesSnapshot =>
  isObject(x) && isString(x.ndc) && isString(x.label) && isString(x.unit)
  && (x.color === undefined || isString(x.color)) && Array.isArray(x.points)
  && x.points.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number");

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

const isStoredExplorerItem = (x: unknown): x is StoredExplorerItem =>
  isObject(x) && x.kind === "chart" && isString(x.id) && isString(x.defaultTitle)
  && (x.title === undefined || isString(x.title)) && typeof x.createdAt === "number"
  && isObject(x.layout) && (x.layout.width === "half" || x.layout.width === "full")
  && typeof x.collapsed === "boolean" && (x.chartType === "line" || x.chartType === "bar")
  && Array.isArray(x.series) && x.series.every(isSeriesSnapshot)
  && isObject(x.source) && isString(x.source.searchLabel) && isSeriesKind(x.source.seriesKind)
  && typeof x.source.seriesCount === "number" && typeof x.source.resultSeriesCount === "number"
  && typeof x.source.filtered === "boolean"
  && (x.dateWindow === undefined || isDateWindow(x.dateWindow))
  && (x.changeSpan === undefined || isChangeSpan(x.changeSpan))
  && (x.barValue === undefined || isBarValue(x.barValue))
  && (x.matchScale === undefined || typeof x.matchScale === "boolean");

/** Keeps the items that are well formed; one bad item does not cost the user the rest. */
const validItems = (x: unknown): ExplorerItem[] => Array.isArray(x)
  ? x.filter(isStoredExplorerItem).map(item => ({ ...item, dateWindow: item.dateWindow ?? FULL_WINDOW }))
  : [];

const isFdaSearchParams = (x: unknown): x is AdvancedFdaSearchParams =>
  isObject(x) && isString(x.proprietaryName)
  && typeof x.includeSamplePackages === "boolean" && typeof x.includeResultsWNoPrices === "boolean";

const isFdaResultFilter = (x: unknown): x is FdaResultFilter =>
  isObject(x) && isStringArray(x.excludedProductNdcs) && isStringArray(x.excludedDosageForms)
  && isStringArray(x.excludedRoutes) && isStringArray(x.excludedLabelers)
  && typeof x.excludeOtc === "boolean" && typeof x.excludeSamplePackages === "boolean";

const isNadacSearchParams = (x: unknown): x is NadacSearchParams =>
  isObject(x) && isString(x.ndcDescription) && isString(x.ndc) && isString(x.minDate) && isString(x.maxDate);

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
    // Settings are safe to share: every window follows them (`watchSettings`).
    if (event.key === SETTINGS_KEY) return;
    if (event.key !== null && lastWritten.has(event.key) && lastWritten.get(event.key) === event.newValue) return;
    readOnly = true;
    onConflict();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

// --- Settings ------------------------------------------------------------------------------

const isBarStyle = oneOf<BarStyle>(["dot", "bar"]);

/** The app-wide settings, field by field, each falling back to its default. */
export function loadSettings(): AppSettings {
  const raw = read(SETTINGS_KEY, isObject);
  return {
    barStyle: raw && isBarStyle(raw.barStyle) ? raw.barStyle : DEFAULT_SETTINGS.barStyle,
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

/** What both search tab types save from `ExplorerItemsContext`. */
export type PersistedExplorerState = {
  pinnedItems: ExplorerItem[],
  /** The Page Tools chart dates. */
  chartDates: ChartDates,
};

export type PersistedFdaTab = {
  type: "fda",
  searchParams: AdvancedFdaSearchParams | null,
  resultFilter: FdaResultFilter,
  detailLevel: FdaResultDetailLevel,
} & PersistedExplorerState;

export type PersistedNadacTab = {
  type: "nadac",
  searchParams: NadacSearchParams | null,
  excludedNdcDescriptions: string[],
} & PersistedExplorerState;

export type PersistedCollectionTab = {
  type: "collection"
} & PersistedExplorerState;

type PersistedTab = PersistedFdaTab | PersistedNadacTab | PersistedCollectionTab;

/*
 * Tab state is validated field by field, each with its own default, so one bad field never
 * costs the user the tab's pinned items. A page filter is kept only alongside a valid search:
 * on its own it would filter nothing meaningful.
 */

function loadExplorerState(raw: Record<string, unknown>): PersistedExplorerState {
  return {
    pinnedItems: validItems(raw.pinnedItems),
    chartDates: isChartDates(raw.chartDates) ? raw.chartDates : ALL_DATES,
  };
}

function readTab(tabId: string, type: PersistedTab["type"]): Record<string, unknown> | null {
  const raw = read(tabKey(tabId), isObject);
  return raw && raw.type === type ? raw : null;
}

export function loadFdaTabState(tabId: string): PersistedFdaTab | null {
  const raw = readTab(tabId, "fda");
  if (!raw) return null;
  const searchParams = isFdaSearchParams(raw.searchParams) ? raw.searchParams : null;
  return {
    type: "fda",
    searchParams,
    resultFilter: searchParams && isFdaResultFilter(raw.resultFilter) ? raw.resultFilter : createFdaResultFilter(),
    detailLevel: isDetailLevel(raw.detailLevel) ? raw.detailLevel : "product",
    ...loadExplorerState(raw),
  };
}

export function loadNadacTabState(tabId: string): PersistedNadacTab | null {
  const raw = readTab(tabId, "nadac");
  if (!raw) return null;
  const searchParams = isNadacSearchParams(raw.searchParams) ? raw.searchParams : null;
  return {
    type: "nadac",
    searchParams,
    excludedNdcDescriptions: searchParams && isStringArray(raw.excludedNdcDescriptions) ? raw.excludedNdcDescriptions : [],
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

export function saveTabState(tabId: string, state: PersistedTab): void {
  write(tabKey(tabId), state);
}

export function removeTabState(tabId: string): void {
  remove(tabKey(tabId));
}
