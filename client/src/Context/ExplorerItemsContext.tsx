import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ExplorerItem } from "../library/explorerItems";
import { ALL_DATES, type ChartDates } from "../library/dates";
import type { PersistedExplorerState } from "../library/persist";

const HIGHLIGHT_MS = 2000;

type Highlight = {
  id: string,
  /**
   * Scroll the item into view and move focus to its heading (Add Chart, and pinning an added
   * chart, which moves its card). Pinning an auto chart only highlights.
   */
  focus: boolean,
};

type ExplorerItemsContextType = {
  pinnedItems: ExplorerItem[];
  /** Charts made with Add Chart that the user hasn't pinned. Not saved; a new search clears them. */
  unpinnedItems: ExplorerItem[];
  addItem: (item: ExplorerItem, options?: { focus?: boolean }) => void;
  addUnpinnedItem: (item: ExplorerItem, options?: { focus?: boolean }) => void;
  /** Moves an unpinned item to the end of the pinned items. */
  pinItem: (id: string) => void;
  clearUnpinnedItems: () => void;
  updateItem: (id: string, update: (item: ExplorerItem) => ExplorerItem) => void;
  removeItem: (id: string) => void;
  /** Moves an item up (-1) or down (+1) one place within its own list. */
  moveItem: (id: string, delta: -1 | 1) => void;
  setAllCollapsed: (pinned: boolean, collapsed: boolean) => void;
  /** The item just added, briefly, so its card can draw attention to itself. */
  highlight: Highlight | null;
  /** The Page Tools chart dates. `useChartWindow` resolves them against the current search. */
  chartDates: ChartDates;
  setChartDates: (chartDates: ChartDates) => void;
};

export const ExplorerItemsContext = createContext<ExplorerItemsContextType>({
  pinnedItems: [],
  unpinnedItems: [],
  addItem: () => { },
  addUnpinnedItem: () => { },
  pinItem: () => { },
  clearUnpinnedItems: () => { },
  updateItem: () => { },
  removeItem: () => { },
  moveItem: () => { },
  setAllCollapsed: () => { },
  highlight: null,
  chartDates: ALL_DATES,
  setChartDates: () => { },
});

type ProviderProps = {
  children: React.ReactNode,
  /** State restored from storage. */
  initial?: PersistedExplorerState,
};

// Both lists live in one state so moving an item between them is a single update. Each update
// keeps the identity of a list it doesn't change, so saving and Match scale skip it.
type Items = {
  pinned: ExplorerItem[],
  unpinned: ExplorerItem[],
};

/** Applies `update` to whichever list holds `id`. */
const inListOf = (items: Items, id: string, update: (list: ExplorerItem[]) => ExplorerItem[]): Items => {
  if (items.pinned.some(item => item.id === id)) return { ...items, pinned: update(items.pinned) };
  if (items.unpinned.some(item => item.id === id)) return { ...items, unpinned: update(items.unpinned) };
  return items;
};

/**
 * Holds one tab's pinned and unpinned items and the chart settings both search pages share. Each
 * search tab type wraps its own provider with this.
 */
export const ExplorerItemsProvider = ({ children, initial }: ProviderProps) => {
  const [items, setItems] = useState<Items>(() => ({ pinned: initial?.pinnedItems ?? [], unpinned: [] }));
  const [chartDates, setChartDates] = useState<ChartDates>(initial?.chartDates ?? ALL_DATES);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = useCallback((id: string, focus: boolean) => {
    setHighlight({ id, focus });
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  }, []);

  const addItem = useCallback((item: ExplorerItem, options?: { focus?: boolean }) => {
    setItems(prev => ({ ...prev, pinned: [...prev.pinned, item] }));
    flash(item.id, options?.focus ?? false);
  }, [flash]);

  const addUnpinnedItem = useCallback((item: ExplorerItem, options?: { focus?: boolean }) => {
    setItems(prev => ({ ...prev, unpinned: [...prev.unpinned, item] }));
    flash(item.id, options?.focus ?? false);
  }, [flash]);

  // The card moves to another section and loses focus with it, so focus follows it there.
  const pinItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.unpinned.find(item => item.id === id);
      if (!item) return prev;
      return { pinned: [...prev.pinned, item], unpinned: prev.unpinned.filter(item => item.id !== id) };
    });
    flash(id, true);
  }, [flash]);

  const clearUnpinnedItems = useCallback(() => {
    setItems(prev => prev.unpinned.length === 0 ? prev : { ...prev, unpinned: [] });
  }, []);

  const updateItem = useCallback((id: string, update: (item: ExplorerItem) => ExplorerItem) => {
    setItems(prev => inListOf(prev, id, list => list.map(item => item.id === id ? update(item) : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => inListOf(prev, id, list => list.filter(item => item.id !== id)));
  }, []);

  const moveItem = useCallback((id: string, delta: -1 | 1) => {
    setItems(prev => inListOf(prev, id, list => {
      const from = list.findIndex(item => item.id === id);
      const to = from + delta;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    }));
  }, []);

  const setAllCollapsed = useCallback((pinned: boolean, collapsed: boolean) => {
    const key = pinned ? "pinned" : "unpinned";
    setItems(prev => ({ ...prev, [key]: prev[key].map(item => ({ ...item, collapsed })) }));
  }, []);

  const { pinned: pinnedItems, unpinned: unpinnedItems } = items;

  const value = useMemo(() => ({
    pinnedItems, unpinnedItems, addItem, addUnpinnedItem, pinItem, clearUnpinnedItems,
    updateItem, removeItem, moveItem, setAllCollapsed, highlight, chartDates, setChartDates,
  }), [pinnedItems, unpinnedItems, addItem, addUnpinnedItem, pinItem, clearUnpinnedItems,
    updateItem, removeItem, moveItem, setAllCollapsed, highlight, chartDates]);

  return (
    <ExplorerItemsContext.Provider value={value}>
      {children}
    </ExplorerItemsContext.Provider>
  );
};

export const useExplorerItems = () => {
  return useContext(ExplorerItemsContext);
};
