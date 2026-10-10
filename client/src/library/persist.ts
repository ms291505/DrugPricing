import toast from "react-hot-toast";
import type {
  AdvancedFdaSearchParams, FdaResultDetailLevel, FdaResultFilter, LayoutMode, NadacSearchParams, TabType, WorkspaceTab,
} from "./types";
import type { ChartSeriesSnapshot, ExplorerItem, SeriesKind } from "./explorerItems";

/*
 * Saves the workspace and each search tab's state to localStorage so they survive a reload.
 * Restored search tabs re-run their search (system items regenerate from fresh data); pinned
 * items come back from their stored snapshots.
 *
 * Everything here is best effort: storage can be unavailable (private windows, blocked site
 * data) or full. Reads fall back to defaults, writes report once and carry on. Every key and
 * payload carries VERSION; bump it when a stored shape changes incompatibly, and old data is
 * ignored rather than misread.
 */

const VERSION = 1;
const PREFIX = `drugpricing.v${VERSION}`;
const WORKSPACE_KEY = `${PREFIX}.workspace`;
const TAB_KEY_PREFIX = `${PREFIX}.tab.`;
const tabKey = (tabId: string) => TAB_KEY_PREFIX + tabId;

/** Tab ids for the standalone /fda-search and /nadac-search pages, which are not workspace tabs. */
export const STANDALONE_TAB_IDS = { fda: "page-fda", nadac: "page-nadac" } as const;

type Envelope<T> = { version: number, data: T };

let warnedWriteFailure = false;

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
  try {
    localStorage.setItem(key, JSON.stringify({ version: VERSION, data } satisfies Envelope<T>));
  } catch (error) {
    console.warn("Could not save to localStorage:", error);
    if (!warnedWriteFailure) {
      warnedWriteFailure = true;
      toast.error("Couldn't save your workspace: browser storage is full or unavailable.");
    }
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

// --- Validation -------------------------------------------------------------------------

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isString = (x: unknown): x is string => typeof x === "string";
const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every(isString);
const isBooleanOrNull = (x: unknown): x is boolean | null => typeof x === "boolean" || x === null;
const oneOf = <T extends string>(values: readonly T[]) => (x: unknown): x is T => values.includes(x as T);

const isTabType = oneOf<TabType>(["fda", "nadac", "new"]);
const isLayoutMode = oneOf<LayoutMode>(["single", "split-2", "split-4"]);
const isDetailLevel = oneOf<FdaResultDetailLevel>(["product", "package"]);
const isSeriesKind = oneOf<SeriesKind>(["product", "package", "ndc"]);

const isWorkspaceTab = (x: unknown): x is WorkspaceTab =>
  isObject(x) && isString(x.id) && isString(x.title) && isTabType(x.type);

const isSeriesSnapshot = (x: unknown): x is ChartSeriesSnapshot =>
  isObject(x) && isString(x.ndc) && isString(x.label) && isString(x.unit) && Array.isArray(x.points)
  && x.points.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number");

const isExplorerItem = (x: unknown): x is ExplorerItem =>
  isObject(x) && x.kind === "chart" && isString(x.id) && isString(x.defaultTitle)
  && (x.title === undefined || isString(x.title)) && typeof x.createdAt === "number"
  && isObject(x.layout) && (x.layout.width === "half" || x.layout.width === "full")
  && typeof x.collapsed === "boolean" && (x.chartType === "line" || x.chartType === "bar")
  && Array.isArray(x.series) && x.series.every(isSeriesSnapshot)
  && isObject(x.source) && isString(x.source.searchLabel) && isSeriesKind(x.source.seriesKind)
  && typeof x.source.seriesCount === "number" && typeof x.source.resultSeriesCount === "number"
  && typeof x.source.filtered === "boolean";

/** Keeps the items that are well formed; one bad item does not cost the user the rest. */
const validItems = (x: unknown): ExplorerItem[] => Array.isArray(x) ? x.filter(isExplorerItem) : [];

const isFdaSearchParams = (x: unknown): x is AdvancedFdaSearchParams =>
  isObject(x) && isString(x.proprietaryName)
  && typeof x.includeSamplePackages === "boolean" && typeof x.includeResultsWNoPrices === "boolean";

const isFdaResultFilter = (x: unknown): x is FdaResultFilter =>
  isObject(x) && isStringArray(x.productNdcs) && isStringArray(x.dosageForms) && isStringArray(x.routes)
  && isStringArray(x.labelers) && isBooleanOrNull(x.includeOtc) && isBooleanOrNull(x.includeSamplePackages);

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

/** Drops stored tab state for tabs that no longer exist (e.g. closed in another session). */
export function pruneTabStates(keepTabIds: string[]): void {
  const keep = new Set([...keepTabIds, ...Object.values(STANDALONE_TAB_IDS)].map(tabKey));
  try {
    const stale = Object.keys(localStorage).filter(key => key.startsWith(TAB_KEY_PREFIX) && !keep.has(key));
    stale.forEach(remove);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

// --- Search tabs --------------------------------------------------------------------------

export type PersistedFdaTab = {
  type: "fda",
  searchParams: AdvancedFdaSearchParams | null,
  resultFilter: FdaResultFilter,
  detailLevel: FdaResultDetailLevel,
  pinnedItems: ExplorerItem[],
};

export type PersistedNadacTab = {
  type: "nadac",
  searchParams: NadacSearchParams | null,
  excludedNdcDescriptions: string[],
  pinnedItems: ExplorerItem[],
};

type PersistedTab = PersistedFdaTab | PersistedNadacTab;

const isPersistedTab = (x: unknown): x is PersistedTab => {
  if (!isObject(x)) return false;
  if (x.type === "fda")
    return (x.searchParams === null || isFdaSearchParams(x.searchParams))
      && isFdaResultFilter(x.resultFilter) && isDetailLevel(x.detailLevel);
  if (x.type === "nadac")
    return (x.searchParams === null || isNadacSearchParams(x.searchParams))
      && isStringArray(x.excludedNdcDescriptions);
  return false;
};

export function loadTabState<T extends PersistedTab["type"]>(
  tabId: string,
  type: T,
): Extract<PersistedTab, { type: T }> | null {
  const state = read(tabKey(tabId), isPersistedTab);
  if (!state || state.type !== type) return null;
  return { ...state, pinnedItems: validItems(state.pinnedItems) } as Extract<PersistedTab, { type: T }>;
}

export function saveTabState(tabId: string, state: PersistedTab): void {
  write(tabKey(tabId), state);
}

export function removeTabState(tabId: string): void {
  remove(tabKey(tabId));
}
